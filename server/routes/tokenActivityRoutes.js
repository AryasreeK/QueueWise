import express from "express";
import TokenActivity from "../models/TokenActivity.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

const VALID_ACTIONS = [
  "generated",
  "called",
  "completed",
  "skipped",
  "unskipped",
  "cancelled",
  "expired",
];

// Get token activity history. Superadmin access only.
router.get("/", protect, allowRoles("superadmin"), async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );

    const { search = "", action = "", serviceId = "" } = req.query;

    const query = {};

    if (action && VALID_ACTIONS.includes(action)) {
      query.action = action;
    }

    if (serviceId) {
      query.serviceId = serviceId;
    }

    if (search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");

      query.$or = [
        { tokenNumber: searchRegex },
        { customerName: searchRegex },
        { serviceName: searchRegex },
        { performedByName: searchRegex },
        { performedByRole: searchRegex },
        { details: searchRegex },
      ];
    }

    const totalRecords = await TokenActivity.countDocuments(query);

    const activities = await TokenActivity.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      activities,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
