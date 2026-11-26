import express from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import Service from "../models/Service.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// All Team Management operations require Superadmin access.
router.use(protect, allowRoles("superadmin"));

// --------------------------------------------------
// GET ALL ADMIN AND STAFF ACCOUNTS
// --------------------------------------------------

router.get("/", async (_req, res, next) => {
  try {
    const members = await User.find({
      role: { $in: ["admin", "staff"] },
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ members });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// ACTIVATE OR DEACTIVATE AN ACCOUNT
// --------------------------------------------------

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { active } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid team member ID.",
      });
    }

    if (typeof active !== "boolean") {
      return res.status(400).json({
        message: "Active status must be true or false.",
      });
    }

    // Prevent the logged-in Superadmin from deactivating their own account.
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot change your own account status here.",
      });
    }

    const member = await User.findOneAndUpdate(
      {
        _id: id,
        role: { $in: ["admin", "staff"] },
      },
      {
        $set: { active },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!member) {
      return res.status(404).json({
        message: "Admin or Staff account not found.",
      });
    }

    res.json({
      message: active
        ? "Account activated successfully."
        : "Account deactivated successfully.",
      member: member.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// ASSIGN SERVICES TO A STAFF MEMBER
// --------------------------------------------------

router.patch("/:id/assignments", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedServices } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid team member ID.",
      });
    }

    if (!Array.isArray(assignedServices)) {
      return res.status(400).json({
        message: "Assigned services must be an array.",
      });
    }

    if (!assignedServices.every((serviceId) => typeof serviceId === "string")) {
      return res.status(400).json({
        message: "Every service ID must be a string.",
      });
    }

    // Remove duplicate service IDs.
    const uniqueAssignments = [...new Set(assignedServices)];

    // Validate against MongoDB, including inactive services.
    const validServices = await Service.find({
      id: { $in: uniqueAssignments },
    }).select("id");

    const validServiceIds = validServices.map((service) => service.id);

    const invalidServices = uniqueAssignments.filter(
      (serviceId) => !validServiceIds.includes(serviceId),
    );

    if (invalidServices.length > 0) {
      return res.status(400).json({
        message: "One or more selected services do not exist.",
      });
    }

    const member = await User.findOneAndUpdate(
      {
        _id: id,
        role: "staff",
      },
      {
        $set: { assignedServices: uniqueAssignments },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!member) {
      return res.status(404).json({
        message: "Staff account not found.",
      });
    }

    res.json({
      message: "Staff service assignments updated successfully.",
      member: member.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
