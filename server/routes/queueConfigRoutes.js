import express from "express";
import QueueConfig from "../models/QueueConfig.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, allowRoles("admin", "superadmin"));

const DEFAULT_CONFIG = {
  configKey: "global",
  maxWaitingPerService: 50,
  ticketExpiryHours: 2,
  allowCancellation: true,
  operatingHours: {
    enabled: false,
    openingTime: "09:00",
    closingTime: "17:00",
    timeZone: "Asia/Kolkata",
  },
  notificationsEnabled: false,
};

function validTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// Get current configuration.
router.get("/", async (_req, res, next) => {
  try {
    const config = await QueueConfig.findOneAndUpdate(
      { configKey: "global" },
      { $setOnInsert: DEFAULT_CONFIG },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    return res.json(config);
  } catch (error) {
    next(error);
  }
});

// Update configuration.
router.put("/", async (req, res, next) => {
  try {
    const {
      maxWaitingPerService,
      ticketExpiryHours,
      allowCancellation,
      operatingHours,
      notificationsEnabled,
    } = req.body || {};

    if (
      !Number.isInteger(maxWaitingPerService) ||
      maxWaitingPerService < 1 ||
      maxWaitingPerService > 500
    ) {
      return res.status(400).json({
        message: "Maximum waiting tokens must be between 1 and 500.",
      });
    }

    if (
      !Number.isInteger(ticketExpiryHours) ||
      ticketExpiryHours < 1 ||
      ticketExpiryHours > 24
    ) {
      return res.status(400).json({
        message: "Ticket expiry must be between 1 and 24 hours.",
      });
    }

    if (typeof allowCancellation !== "boolean") {
      return res.status(400).json({
        message: "Invalid cancellation setting.",
      });
    }

    if (typeof notificationsEnabled !== "boolean") {
      return res.status(400).json({
        message: "Invalid notification setting.",
      });
    }

    if (
      !operatingHours ||
      typeof operatingHours.enabled !== "boolean" ||
      !validTime(operatingHours.openingTime) ||
      !validTime(operatingHours.closingTime)
    ) {
      return res.status(400).json({
        message: "Please provide valid operating hours.",
      });
    }

    if (operatingHours.openingTime >= operatingHours.closingTime) {
      return res.status(400).json({
        message: "Closing time must be later than opening time.",
      });
    }

    const updatedConfig = await QueueConfig.findOneAndUpdate(
      { configKey: "global" },
      {
        $set: {
          maxWaitingPerService,
          ticketExpiryHours,
          allowCancellation,
          operatingHours: {
            enabled: operatingHours.enabled,
            openingTime: operatingHours.openingTime,
            closingTime: operatingHours.closingTime,
            timeZone: "Asia/Kolkata",
          },
          notificationsEnabled,
        },
        $setOnInsert: {
          configKey: "global",
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    ).lean();

    return res.json({
      message: "Queue configuration saved successfully.",
      config: updatedConfig,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
