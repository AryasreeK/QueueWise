import express from "express";
import mongoose from "mongoose";

import SupportRequest from "../models/SupportRequest.js";
import User from "../models/User.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Every Support Centre operation requires authentication.
router.use(protect);

const adminRoles = ["admin", "superadmin"];
const requesterRoles = ["user", "staff"];

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function addMessage(request, user, message) {
  request.messages.push({
    senderId: user._id,
    senderName: user.name,
    senderRole: user.role,
    message,
  });
}

function populateRequest(query) {
  return query
    .populate("assignedTo", "name email role")
    .populate("requester", "name email role")
    .populate("messages.senderId", "name role")
    .populate("assignmentHistory.performedBy", "name role")
    .populate("assignmentHistory.previousAssignee", "name role")
    .populate("assignmentHistory.newAssignee", "name role");
}

// --------------------------------------------------
// SUBMIT A SUPPORT REQUEST
// User and Staff can submit requests.
// --------------------------------------------------

router.post("/", allowRoles(...requesterRoles), async (req, res, next) => {
  try {
    const { subject, category, description } = req.body || {};

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        message: "Subject and description are required.",
      });
    }

    if (subject.trim().length > 150) {
      return res.status(400).json({
        message: "Subject cannot exceed 150 characters.",
      });
    }

    if (description.trim().length > 3000) {
      return res.status(400).json({
        message: "Description cannot exceed 3000 characters.",
      });
    }

    const validCategories = [
      "technical",
      "token",
      "account",
      "service",
      "other",
    ];

    const selectedCategory = category || "other";

    if (!validCategories.includes(selectedCategory)) {
      return res.status(400).json({
        message: "Invalid support category.",
      });
    }

    const supportRequest = await SupportRequest.create({
      subject: subject.trim(),
      category: selectedCategory,
      description: description.trim(),
      requester: req.user._id,
      requesterName: req.user.name,
      requesterEmail: req.user.email,
    });

    res.status(201).json({
      message: "Support request submitted successfully.",
      request: supportRequest,
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// GET THE LOGGED-IN USER'S OWN REQUESTS
// --------------------------------------------------

router.get("/mine", allowRoles(...requesterRoles), async (req, res, next) => {
  try {
    const requests = await populateRequest(
      SupportRequest.find({ requester: req.user._id }).sort({
        createdAt: -1,
      }),
    );

    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// GET ALL SUPPORT REQUESTS
// Admin and Superadmin only.
// --------------------------------------------------

router.get("/", allowRoles(...adminRoles), async (req, res, next) => {
  try {
    const { status, priority } = req.query;
    const filter = {};

    const validStatuses = [
      "open",
      "claimed",
      "in_progress",
      "resolved",
      "closed",
    ];

    const validPriorities = ["low", "medium", "high", "urgent"];

    if (status && validStatuses.includes(status)) {
      filter.status = status;
    }

    if (priority && validPriorities.includes(priority)) {
      filter.priority = priority;
    }

    const requests = await populateRequest(
      SupportRequest.find(filter).sort({
        createdAt: -1,
      }),
    );

    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// GET ONE SUPPORT REQUEST
// Requester can view their own request.
// Admin and Superadmin can view any request.
// --------------------------------------------------

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid support request ID.",
      });
    }

    const request = await populateRequest(SupportRequest.findById(id));

    if (!request) {
      return res.status(404).json({
        message: "Support request not found.",
      });
    }

    const isAdmin = adminRoles.includes(req.user.role);
    const isOwner =
      request.requester?._id.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: "You cannot view this support request.",
      });
    }

    res.json({ request });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// CLAIM AN UNASSIGNED REQUEST
// Admin and Superadmin only.
// --------------------------------------------------

router.patch(
  "/:id/claim",
  allowRoles(...adminRoles),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          message: "Invalid support request ID.",
        });
      }

      const request = await SupportRequest.findOneAndUpdate(
        {
          _id: id,
          assignedTo: null,
          status: "open",
        },
        {
          $set: {
            assignedTo: req.user._id,
            status: "claimed",
            claimedAt: new Date(),
          },
          $push: {
            assignmentHistory: {
              action: "claimed",
              previousAssignee: null,
              newAssignee: req.user._id,
              performedBy: req.user._id,
              performedByName: req.user.name,
            },
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!request) {
        const existing = await SupportRequest.findById(id);

        if (!existing) {
          return res.status(404).json({
            message: "Support request not found.",
          });
        }

        return res.status(409).json({
          message: "This request is already claimed or is not open.",
        });
      }

      const populatedRequest = await populateRequest(
        SupportRequest.findById(request._id),
      );

      res.json({
        message: "Support request claimed successfully.",
        request: populatedRequest,
      });
    } catch (error) {
      next(error);
    }
  },
);

// --------------------------------------------------
// REASSIGN A CLAIMED REQUEST
// SUPERADMIN ONLY.
// --------------------------------------------------

router.patch(
  "/:id/reassign",
  allowRoles("superadmin"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newAssigneeId, note } = req.body || {};

      if (!isValidId(id)) {
        return res.status(400).json({
          message: "Invalid support request ID.",
        });
      }

      if (!isValidId(newAssigneeId)) {
        return res.status(400).json({
          message: "A valid new Admin ID is required.",
        });
      }

      if (note !== undefined && typeof note !== "string") {
        return res.status(400).json({
          message: "Reassignment note must be text.",
        });
      }

      if (typeof note === "string" && note.trim().length > 500) {
        return res.status(400).json({
          message: "Reassignment note cannot exceed 500 characters.",
        });
      }

      const newAssignee = await User.findOne({
        _id: newAssigneeId,
        role: "admin",
        active: true,
      }).select("_id name email role");

      if (!newAssignee) {
        return res.status(404).json({
          message: "Active Admin account not found.",
        });
      }

      const request = await SupportRequest.findById(id);

      if (!request) {
        return res.status(404).json({
          message: "Support request not found.",
        });
      }

      if (
        !request.assignedTo ||
        !["claimed", "in_progress"].includes(request.status)
      ) {
        return res.status(409).json({
          message: "Only a claimed or in-progress request can be reassigned.",
        });
      }

      if (request.assignedTo.toString() === newAssigneeId) {
        return res.status(400).json({
          message: "This request is already assigned to that Admin.",
        });
      }

      const previousAssignee = request.assignedTo;

      request.assignedTo = newAssignee._id;

      request.assignmentHistory.push({
        action: "reassigned",
        previousAssignee,
        newAssignee: newAssignee._id,
        performedBy: req.user._id,
        performedByName: req.user.name,
        note: note?.trim() || "",
      });

      await request.save();

      const populatedRequest = await populateRequest(
        SupportRequest.findById(request._id),
      );

      res.json({
        message: "Support request reassigned successfully.",
        request: populatedRequest,
      });
    } catch (error) {
      next(error);
    }
  },
);

// --------------------------------------------------
// ADD A REPLY
// Requester can reply to their own open request.
// Admin and Superadmin can reply to any open request.
// --------------------------------------------------

router.post("/:id/messages", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body || {};

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid support request ID.",
      });
    }

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.trim().length > 3000
    ) {
      return res.status(400).json({
        message: "Reply must contain 1 to 3000 characters.",
      });
    }

    const request = await SupportRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        message: "Support request not found.",
      });
    }

    const isAdmin = adminRoles.includes(req.user.role);
    const isOwner = request.requester.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: "You cannot reply to this support request.",
      });
    }

    if (["resolved", "closed"].includes(request.status)) {
      return res.status(409).json({
        message: "This support request is already resolved or closed.",
      });
    }

    addMessage(request, req.user, message.trim());

    if (isAdmin && request.status === "claimed") {
      request.status = "in_progress";
    }

    await request.save();

    const populatedRequest = await populateRequest(
      SupportRequest.findById(request._id),
    );

    res.json({
      message: "Reply added successfully.",
      request: populatedRequest,
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// RESOLVE A SUPPORT REQUEST
// Admin and Superadmin only.
// --------------------------------------------------

router.patch(
  "/:id/resolve",
  allowRoles(...adminRoles),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          message: "Invalid support request ID.",
        });
      }

      const request = await SupportRequest.findById(id);

      if (!request) {
        return res.status(404).json({
          message: "Support request not found.",
        });
      }

      if (["resolved", "closed"].includes(request.status)) {
        return res.status(409).json({
          message: "This request is already resolved or closed.",
        });
      }

      request.status = "resolved";
      request.resolvedAt = new Date();

      await request.save();

      const populatedRequest = await populateRequest(
        SupportRequest.findById(request._id),
      );

      res.json({
        message: "Support request resolved successfully.",
        request: populatedRequest,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
