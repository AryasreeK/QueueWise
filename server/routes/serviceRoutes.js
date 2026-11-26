import express from "express";
import Service from "../models/Service.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, allowRoles("superadmin", "admin"));

// Get all services, including inactive services.
router.get("/", async (_req, res, next) => {
  try {
    const services = await Service.find().sort({ createdAt: 1 });
    res.json(services);
  } catch (error) {
    next(error);
  }
});

// Add a new service.
router.post("/", async (req, res, next) => {
  try {
    const { name, description, prefix, avgMinutes, color } = req.body;

    if (!name?.trim() || !prefix?.trim()) {
      return res.status(400).json({
        message: "Service name and token prefix are required.",
      });
    }

    const cleanPrefix = prefix.trim().toUpperCase();

    if (!/^[A-Z]{2,4}$/.test(cleanPrefix)) {
      return res.status(400).json({
        message: "Prefix must contain 2 to 4 letters.",
      });
    }

    const cleanName = name.trim();
    const id = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existing = await Service.findOne({
      $or: [{ id }, { prefix: cleanPrefix }],
    });

    if (existing) {
      return res.status(409).json({
        message: "A service with this name or prefix already exists.",
      });
    }

    const minutes = Number(avgMinutes ?? 5);

    if (!Number.isFinite(minutes) || minutes < 1) {
      return res.status(400).json({
        message: "Average waiting time must be at least 1 minute.",
      });
    }

    const service = await Service.create({
      id,
      name: cleanName,
      description: description?.trim() || "",
      prefix: cleanPrefix,
      avgMinutes: minutes,
      color: color || "blue",
      active: true,
    });

    res.status(201).json({
      message: "Service created successfully.",
      service,
    });
  } catch (error) {
    next(error);
  }
});

// Edit an existing service.
router.patch("/:id", async (req, res, next) => {
  try {
    const { name, description, avgMinutes, color } = req.body;

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Service name cannot be empty.",
        });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = String(description).trim();
    }

    if (avgMinutes !== undefined) {
      const minutes = Number(avgMinutes);

      if (!Number.isFinite(minutes) || minutes < 1) {
        return res.status(400).json({
          message: "Average waiting time must be at least 1 minute.",
        });
      }

      updates.avgMinutes = minutes;
    }

    if (color !== undefined) {
      updates.color = color;
    }

    const service = await Service.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!service) {
      return res.status(404).json({
        message: "Service not found.",
      });
    }

    res.json({
      message: "Service updated successfully.",
      service,
    });
  } catch (error) {
    next(error);
  }
});

// Activate or deactivate a service.
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({
        message: "Please provide a valid active status.",
      });
    }

    const service = await Service.findOneAndUpdate(
      { id: req.params.id },
      { $set: { active } },
      { new: true },
    );

    if (!service) {
      return res.status(404).json({
        message: "Service not found.",
      });
    }

    res.json({
      message: active
        ? "Service activated successfully."
        : "Service deactivated successfully.",
      service,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
