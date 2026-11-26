import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import rateLimit from "express-rate-limit";

import Service from "../models/Service.js";
import QueueConfig from "../models/QueueConfig.js";

import { services } from "./store.js";
import QueueToken from "../models/QueueToken.js";
import TokenActivity from "../models/TokenActivity.js";
import ServiceCounter from "../models/ServiceCounter.js";

import queueConfigRoutes from "../routes/queueConfigRoutes.js";
import analyticsRoutes from "../routes/analyticsRoutes.js";
import serviceRoutes from "../routes/serviceRoutes.js";
import authRoutes from "../routes/authRoutes.js";
import teamRoutes from "../routes/teamRoutes.js";
import supportRoutes from "../routes/supportRoutes.js";
import tokenActivityRoutes from "../routes/tokenActivityRoutes.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const STAFF_ROLES = ["superadmin", "admin", "staff"];

// Retrieve the global queue configuration from MongoDB.
async function getQueueConfig() {
  const config = await QueueConfig.findOneAndUpdate(
    { configKey: "global" },
    {
      $setOnInsert: {
        configKey: "global",
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  return config;
}

// Optional authentication for public queue information.
function optionalProtect(req, res, next) {
  if (!req.headers.authorization) {
    return next();
  }

  return protect(req, res, next);
}

// Check whether a logged-in team member can manage a service.
function checkServiceAccess(req, res, serviceId) {
  // Admin and Superadmin can manage every service.
  if (["superadmin", "admin"].includes(req.user.role)) {
    return true;
  }

  // Staff can manage only their assigned services.
  if (
    req.user.role === "staff" &&
    (req.user.assignedServices || []).includes(serviceId)
  ) {
    return true;
  }

  res.status(403).json({
    message: "You are not assigned to this service.",
  });

  return false;
}

// Middleware

app.use(
  cors({
    origin: [
      "https://queue-wise-umber.vercel.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
  }),
);

app.use(express.json());
// Protect ticket recovery and cancellation from PIN guessing.
const recoveryPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    message:
      "Too many recovery PIN attempts. Please try again after 15 minutes.",
  },
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Superadmin Team Management routes
app.use("/api/team", teamRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/token-activity", tokenActivityRoutes);
app.use("/api/services/manage", serviceRoutes);
app.use("/api/queue-config", queueConfigRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    application: "QueueWise API",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Return active services for the public User Portal.
app.get("/api/services", async (_req, res, next) => {
  try {
    const activeServices = await Service.find({ active: true })
      .select("id name description prefix avgMinutes color active -_id")
      .sort({ createdAt: 1 })
      .lean();

    res.json(activeServices);
  } catch (error) {
    next(error);
  }
});

// Automatically expire waiting tickets past their expiry time.

// Automatically expire waiting tickets and record their activity.
async function expireWaitingTickets() {
  const expiredCandidates = await QueueToken.find({
    status: { $in: ["waiting", "skipped"] },
    expiresAt: { $lte: new Date() },
  });

  for (const token of expiredCandidates) {
    const updatedToken = await QueueToken.findOneAndUpdate(
      {
        _id: token._id,
        status: { $in: ["waiting", "skipped"] },
      },
      {
        $set: {
          status: "expired",
        },
      },
      { new: true },
    );

    if (updatedToken) {
      await logTokenActivity(
        updatedToken,
        "expired",
        { name: "System", role: "system" },
        "Ticket expired automatically.",
      );
    }
  }
}

// Generate a six-digit recovery PIN.
function generateRecoveryPin() {
  return String(randomInt(100000, 1000000));
}

// Record token activity for the Superadmin audit history.
async function logTokenActivity(token, action, user = null, details = "") {
  await TokenActivity.create({
    tokenId: token._id,
    tokenNumber: token.tokenNumber,
    serviceId: token.serviceId,
    serviceName: token.serviceName,
    customerName: token.customerName || "Guest",
    action,
    performedBy: user?._id || null,
    performedByName: user?.name || "Customer",
    performedByRole: user?.role || "user",
    details,
  });
}

// Prepare queue information without retrieving recovery PIN hashes.
async function getQueueData(includePrivateDetails = false) {
  await expireWaitingTickets();

  const tokens = await QueueToken.find().sort({
    createdAt: -1,
    _id: -1,
  });

  // Public responses contain only basic queue information.
  const publicToken = (token) => ({
    id: token.id,
    tokenNumber: token.tokenNumber,
    serviceId: token.serviceId,
    serviceName: token.serviceName,
    status: token.status,
    createdAt: token.createdAt,
  });

  // Authenticated team dashboards receive customer details,
  // but never recovery PIN hashes.
  const teamToken = (token) => ({
    id: token.id,
    tokenNumber: token.tokenNumber,
    serviceId: token.serviceId,
    serviceName: token.serviceName,
    customerName: token.customerName,
    status: token.status,
    createdAt: token.createdAt,
    servedAt: token.servedAt,
    completedAt: token.completedAt,
    cancelledAt: token.cancelledAt,
  });

  const serializeToken = includePrivateDetails ? teamToken : publicToken;

  const visibleTokens = tokens.map(serializeToken);

  const allServices = await Service.find().sort({ createdAt: 1 }).lean();

  const serviceQueues = allServices.map((service) => {
    const serviceTokens = tokens
      .filter((token) => token.serviceId === service.id)
      .sort(
        (a, b) =>
          new Date(a.createdAt) - new Date(b.createdAt) ||
          a._id.toString().localeCompare(b._id.toString()),
      );

    const waiting = serviceTokens
      .filter((token) => token.status === "waiting")
      .map(serializeToken);

    const servingToken =
      serviceTokens.find((token) => token.status === "serving") || null;

    return {
      ...service,
      waitingCount: waiting.length,
      serving: servingToken ? serializeToken(servingToken) : null,
      waiting,
      totalCount: serviceTokens.length,
    };
  });

  return {
    services: serviceQueues,
    tokens: visibleTokens,
    stats: {
      total: tokens.length,
      waiting: tokens.filter((t) => t.status === "waiting").length,
      serving: tokens.filter((t) => t.status === "serving").length,
      completed: tokens.filter((t) => t.status === "completed").length,
      active: tokens.filter((t) => ["waiting", "serving"].includes(t.status))
        .length,
    },
  };
}

// Public queue information.
// Staff members receive only their assigned service queues.
// Admin and Superadmin receive all service queues.

app.get("/api/queue", optionalProtect, async (req, res, next) => {
  try {
    const hasStaffAccess = req.user && STAFF_ROLES.includes(req.user.role);

    const queueData = await getQueueData(Boolean(hasStaffAccess));

    // Public users can see active services only.
    if (!hasStaffAccess) {
      queueData.services = queueData.services.filter(
        (service) => service.active === true,
      );
    }

    // Staff can see only their assigned services,
    // including inactive services with existing queues.
    if (req.user?.role === "staff") {
      const assignedServices = req.user.assignedServices || [];

      queueData.services = queueData.services.filter((service) =>
        assignedServices.includes(service.id),
      );

      queueData.tokens = queueData.tokens.filter((token) =>
        assignedServices.includes(token.serviceId),
      );

      queueData.stats = {
        total: queueData.tokens.length,
        waiting: queueData.tokens.filter((token) => token.status === "waiting")
          .length,
        serving: queueData.tokens.filter((token) => token.status === "serving")
          .length,
        completed: queueData.tokens.filter(
          (token) => token.status === "completed",
        ).length,
        active: queueData.tokens.filter((token) =>
          ["waiting", "serving"].includes(token.status),
        ).length,
      };
    }

    return res.json(queueData);
  } catch (error) {
    next(error);
  }
});

// Generate a new token and recovery PIN.
app.post("/api/tokens", async (req, res, next) => {
  try {
    const { serviceId, customerName } = req.body || {};

    if (!serviceId) {
      return res.status(400).json({
        message: "Please select a service.",
      });
    }

    const service = await Service.findOne({
      id: serviceId,
      active: true,
    }).lean();

    if (!service) {
      return res.status(404).json({
        message: "Service not found.",
      });
    }

    // Load the current queue configuration.
    const config = await getQueueConfig();
    // Check whether token generation is allowed during operating hours.
    if (config.operatingHours?.enabled) {
      const timeZone = config.operatingHours.timeZone || "Asia/Kolkata";

      const currentTime = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date());

      const openingTime = config.operatingHours.openingTime;
      const closingTime = config.operatingHours.closingTime;

      if (currentTime < openingTime || currentTime >= closingTime) {
        return res.status(403).json({
          message: `Token generation is available only between ${openingTime} and ${closingTime}. Please try again during operating hours.`,
        });
      }
    }

    // Count waiting tokens for this service.
    const waitingCount = await QueueToken.countDocuments({
      serviceId,
      status: "waiting",
    });

    // Prevent new tokens when the configured capacity is reached.
    if (waitingCount >= config.maxWaitingPerService) {
      return res.status(409).json({
        message: `This service has reached its waiting limit of ${config.maxWaitingPerService} tokens. Please try again later.`,
      });
    }

    const counter = await ServiceCounter.findOneAndUpdate(
      { serviceId },
      { $inc: { lastNumber: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    const tokenNumber = `${service.prefix}-${String(
      counter.lastNumber,
    ).padStart(3, "0")}`;

    const cleanName =
      typeof customerName === "string" ? customerName.trim().slice(0, 80) : "";

    const recoveryPin = generateRecoveryPin();
    const recoveryPinHash = await bcrypt.hash(recoveryPin, 10);

    const token = await QueueToken.create({
      tokenNumber,
      serviceId: service.id,
      serviceName: service.name,
      customerName: cleanName || "Guest",
      recoveryPinHash,
      status: "waiting",
      expiresAt: new Date(
        Date.now() + config.ticketExpiryHours * 60 * 60 * 1000,
      ),
    });
    await logTokenActivity(token, "generated");

    return res.status(201).json({
      message: "Your token has been generated.",
      token,
      recoveryPin,
      expiryHours: config.ticketExpiryHours,
    });
  } catch (error) {
    next(error);
  }
});

// Recover a ticket using its token number and recovery PIN.
app.post("/api/tokens/recover", recoveryPinLimiter, async (req, res, next) => {
  try {
    await expireWaitingTickets();

    const tokenNumber = String(req.body?.tokenNumber || "")
      .trim()
      .toUpperCase();

    const recoveryPin = String(req.body?.recoveryPin || "").trim();

    if (!tokenNumber || !/^\d{6}$/.test(recoveryPin)) {
      return res.status(400).json({
        message: "Enter a valid token number and six-digit recovery PIN.",
      });
    }

    const token = await QueueToken.findOne({
      tokenNumber,
    }).select("+recoveryPinHash");

    if (!token || !token.recoveryPinHash) {
      return res.status(404).json({
        message: "Ticket not found or recovery is unavailable.",
      });
    }

    const pinMatches = await bcrypt.compare(recoveryPin, token.recoveryPinHash);

    if (!pinMatches) {
      return res.status(401).json({
        message: "Incorrect recovery PIN.",
      });
    }

    const safeToken = token.toJSON();

    delete safeToken.recoveryPinHash;

    return res.json({
      message: "Ticket recovered successfully.",
      token: safeToken,
    });
  } catch (error) {
    next(error);
  }
});

// Cancel a waiting ticket using its recovery PIN.
app.post(
  "/api/tokens/:id/cancel",
  recoveryPinLimiter,
  async (req, res, next) => {
    try {
      const recoveryPin = String(req.body?.recoveryPin || "").trim();

      // Check whether ticket cancellation is enabled.
      const config = await getQueueConfig();

      if (!config.allowCancellation) {
        return res.status(403).json({
          message:
            "Ticket cancellation is currently disabled by the administrator.",
        });
      }

      if (!/^\d{6}$/.test(recoveryPin)) {
        return res.status(400).json({
          message: "Enter your six-digit recovery PIN.",
        });
      }

      await expireWaitingTickets();

      const token = await QueueToken.findById(req.params.id).select(
        "+recoveryPinHash",
      );

      if (!token) {
        return res.status(404).json({
          message: "Ticket not found.",
        });
      }

      if (!token.recoveryPinHash) {
        return res.status(400).json({
          message: "Recovery is unavailable for this ticket.",
        });
      }

      const pinMatches = await bcrypt.compare(
        recoveryPin,
        token.recoveryPinHash,
      );

      if (!pinMatches) {
        return res.status(401).json({
          message: "Incorrect recovery PIN.",
        });
      }

      if (token.status !== "waiting") {
        return res.status(409).json({
          message: "Only waiting tickets can be cancelled.",
        });
      }

      const updatedToken = await QueueToken.findOneAndUpdate(
        {
          _id: token._id,
          status: "waiting",
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
          },
        },
        { new: true },
      );

      if (!updatedToken) {
        return res.status(409).json({
          message: "Ticket status changed. Please refresh.",
        });
      }

      await logTokenActivity(updatedToken, "cancelled");

      return res.json({
        message: `${updatedToken.tokenNumber} has been cancelled.`,
        token: updatedToken,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Call a waiting token.
app.patch(
  "/api/tokens/:id/serve",
  protect,
  allowRoles(...STAFF_ROLES),
  async (req, res, next) => {
    try {
      await expireWaitingTickets();

      const token = await QueueToken.findById(req.params.id);

      if (!token) {
        return res.status(404).json({
          message: "Token not found.",
        });
      }

      // Check whether this Staff member is assigned to the token's service.
      if (!checkServiceAccess(req, res, token.serviceId)) {
        return;
      }

      if (token.status !== "waiting") {
        return res.status(409).json({
          message: "Only waiting tokens can be called.",
        });
      }

      const existingServing = await QueueToken.findOne({
        serviceId: token.serviceId,
        status: "serving",
      });

      if (existingServing) {
        return res.status(409).json({
          message: `${existingServing.tokenNumber} is already being served. Complete or skip it first.`,
        });
      }

      const firstWaiting = await QueueToken.findOne({
        serviceId: token.serviceId,
        status: "waiting",
      }).sort({ createdAt: 1, _id: 1 });

      if (
        !firstWaiting ||
        firstWaiting._id.toString() !== token._id.toString()
      ) {
        return res.status(409).json({
          message: "Please call the earliest waiting token first.",
        });
      }

      const updatedToken = await QueueToken.findOneAndUpdate(
        {
          _id: token._id,
          status: "waiting",
        },
        {
          $set: {
            status: "serving",
            servedAt: new Date(),
          },
        },
        { new: true },
      );

      if (!updatedToken) {
        return res.status(409).json({
          message: "This token was already updated. Refresh the queue.",
        });
      }

      await logTokenActivity(updatedToken, "called", req.user);

      return res.json({
        message: `${updatedToken.tokenNumber} is now being served.`,
        token: updatedToken,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Complete a serving token.
app.patch(
  "/api/tokens/:id/complete",
  protect,
  allowRoles(...STAFF_ROLES),
  async (req, res, next) => {
    try {
      // Check whether this Staff member is assigned to the token's service.
      const token = await QueueToken.findById(req.params.id);

      if (token && !checkServiceAccess(req, res, token.serviceId)) {
        return;
      }

      const updatedToken = await QueueToken.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "serving",
        },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
          },
        },
        { new: true },
      );

      if (!updatedToken) {
        return res.status(409).json({
          message: "Only a serving token can be completed.",
        });
      }

      await logTokenActivity(updatedToken, "completed", req.user);

      return res.json({
        message: `${updatedToken.tokenNumber} has been completed.`,
        token: updatedToken,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Skip a waiting or serving token.
app.patch(
  "/api/tokens/:id/skip",
  protect,
  allowRoles(...STAFF_ROLES),
  async (req, res, next) => {
    try {
      // Check whether this Staff member is assigned to the token's service.
      const token = await QueueToken.findById(req.params.id);

      if (token && !checkServiceAccess(req, res, token.serviceId)) {
        return;
      }

      const updatedToken = await QueueToken.findOneAndUpdate(
        {
          _id: req.params.id,
          status: { $in: ["waiting", "serving"] },
        },
        {
          $set: {
            status: "skipped",
          },
        },
        { new: true },
      );

      if (!updatedToken) {
        return res.status(409).json({
          message: "This token is no longer active.",
        });
      }

      await logTokenActivity(updatedToken, "skipped", req.user);

      return res.json({
        message: `${updatedToken.tokenNumber} has been skipped.`,
        token: updatedToken,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Unskip a ticket and restore it to its original queue position.
app.patch(
  "/api/tokens/:id/unskip",
  protect,
  allowRoles(...STAFF_ROLES),
  async (req, res, next) => {
    try {
      // Expire any tickets whose original expiry time has passed.
      await expireWaitingTickets();

      // Find the ticket.
      const token = await QueueToken.findById(req.params.id);

      if (!token) {
        return res.status(404).json({
          message: "Token not found.",
        });
      }

      // Check whether this Staff member is assigned to the token's service.
      if (!checkServiceAccess(req, res, token.serviceId)) {
        return;
      }

      // Only tickets that are still skipped can be unskipped.
      if (token.status !== "skipped") {
        return res.status(409).json({
          message: "Only skipped tickets can be unskipped.",
        });
      }

      // Reject tickets whose original expiry time has passed.
      if (new Date(token.expiresAt) <= new Date()) {
        return res.status(409).json({
          message: "This ticket has expired and cannot be unskipped.",
        });
      }

      // Restore the ticket without changing createdAt or expiresAt.
      const updatedToken = await QueueToken.findOneAndUpdate(
        {
          _id: token._id,
          status: "skipped",
          expiresAt: { $gt: new Date() },
        },
        {
          $set: {
            status: "waiting",
          },
        },
        { new: true },
      );

      if (!updatedToken) {
        return res.status(409).json({
          message: "Ticket status changed. Please refresh the queue.",
        });
      }

      // Record the unskip action in activity history.
      await logTokenActivity(
        updatedToken,
        "unskipped",
        req.user,
        "Ticket restored to its original queue position.",
      );

      return res.json({
        message: `${updatedToken.tokenNumber} has been restored to the waiting queue.`,
        token: updatedToken,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("QueueWise API error:", err);

  if (err.code === 11000) {
    return res.status(409).json({
      message:
        "Another token is already being served or this token number already exists. Please refresh the queue.",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid token ID.",
    });
  }

  return res.status(500).json({
    message: "Unexpected server error.",
  });
});

// Insert the default services into MongoDB only if they don't exist.
async function seedServices() {
  for (const service of services) {
    await Service.updateOne(
      { id: service.id },
      {
        $setOnInsert: {
          ...service,
          active: true,
        },
      },
      { upsert: true },
    );
  }

  console.log("Default services checked in MongoDB.");
}

// Connect to MongoDB before starting the API.
async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    await seedServices();

    console.log("MongoDB connected successfully.");

    // Background expiry check every minute.
    const expiryTimer = setInterval(() => {
      expireWaitingTickets().catch((error) => {
        console.error("Ticket expiry failed:", error);
      });
    }, 60 * 1000);

    expiryTimer.unref();

    await expireWaitingTickets();

    app.listen(PORT, () => {
      console.log(`QueueWise API running at http://localhost:${PORT}`);
      console.log(
        "Waiting ticket expiry is controlled by Queue Configuration.",
      );
    });
  } catch (error) {
    console.error("QueueWise startup failed:", error.message);
    process.exit(1);
  }
}

start();
