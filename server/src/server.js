import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { services } from "./store.js";
import QueueToken from "../models/QueueToken.js";
import ServiceCounter from "../models/ServiceCounter.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  }),
);

app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    application: "QueueWise API",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Available services
app.get("/api/services", (_req, res) => {
  res.json(services);
});

// Get tokens, service queues and statistics
app.get("/api/queue", async (_req, res, next) => {
  try {
    const tokens = await QueueToken.find().sort({
      createdAt: -1,
      _id: -1,
    });

    const serviceQueues = services.map((service) => {
      const serviceTokens = tokens
        .filter((token) => token.serviceId === service.id)
        .sort(
          (a, b) =>
            new Date(a.createdAt) - new Date(b.createdAt) ||
            a._id.toString().localeCompare(b._id.toString()),
        );

      const waiting = serviceTokens.filter(
        (token) => token.status === "waiting",
      );

      const serving =
        serviceTokens.find((token) => token.status === "serving") || null;

      return {
        ...service,
        waitingCount: waiting.length,
        serving,
        waiting,
        totalCount: serviceTokens.length,
      };
    });

    res.json({
      services: serviceQueues,
      tokens,
      stats: {
        total: tokens.length,
        waiting: tokens.filter((t) => t.status === "waiting").length,
        serving: tokens.filter((t) => t.status === "serving").length,
        completed: tokens.filter((t) => t.status === "completed").length,
        active: tokens.filter((t) => ["waiting", "serving"].includes(t.status))
          .length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Generate a new token
app.post("/api/tokens", async (req, res, next) => {
  try {
    const { serviceId, customerName } = req.body || {};

    if (!serviceId) {
      return res.status(400).json({
        message: "Please select a service.",
      });
    }

    const service = services.find((s) => s.id === serviceId);

    if (!service) {
      return res.status(404).json({
        message: "Service not found.",
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

    const tokenNumber = `${service.prefix}-${String(counter.lastNumber).padStart(3, "0")}`;

    const cleanName =
      typeof customerName === "string" ? customerName.trim().slice(0, 80) : "";

    const token = await QueueToken.create({
      tokenNumber,
      serviceId: service.id,
      serviceName: service.name,
      customerName: cleanName || "Guest",
      status: "waiting",
    });

    return res.status(201).json({
      message: "Your token has been generated.",
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Call a waiting token, enforcing FIFO order
app.patch("/api/tokens/:id/serve", async (req, res, next) => {
  try {
    const token = await QueueToken.findById(req.params.id);

    if (!token) {
      return res.status(404).json({
        message: "Token not found.",
      });
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

    if (!firstWaiting || firstWaiting._id.toString() !== token._id.toString()) {
      return res.status(409).json({
        message: "Please call the earliest waiting token first.",
      });
    }

    // Atomic update. The partial unique index also prevents
    // two tokens from being served at the same service counter.
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

    return res.json({
      message: `${updatedToken.tokenNumber} is now being served.`,
      token: updatedToken,
    });
  } catch (error) {
    next(error);
  }
});

// Complete a serving token
app.patch("/api/tokens/:id/complete", async (req, res, next) => {
  try {
    const token = await QueueToken.findById(req.params.id);

    if (!token) {
      return res.status(404).json({
        message: "Token not found.",
      });
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

    return res.json({
      message: `${updatedToken.tokenNumber} has been completed.`,
      token: updatedToken,
    });
  } catch (error) {
    next(error);
  }
});

// Skip a waiting or serving token
app.patch("/api/tokens/:id/skip", async (req, res, next) => {
  try {
    const token = await QueueToken.findById(req.params.id);

    if (!token) {
      return res.status(404).json({
        message: "Token not found.",
      });
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

    return res.json({
      message: `${updatedToken.tokenNumber} has been skipped.`,
      token: updatedToken,
    });
  } catch (error) {
    next(error);
  }
});

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

// Connect to MongoDB before starting the API
async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(`QueueWise API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("QueueWise startup failed:", error.message);
    process.exit(1);
  }
}

start();
