import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["user", "staff", "admin", "superadmin"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
  },
  { timestamps: true },
);

const assignmentHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["claimed", "reassigned", "unassigned"],
      required: true,
    },
    previousAssignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    newAssignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedByName: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true },
);

const supportRequestSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    category: {
      type: String,
      enum: ["technical", "token", "account", "service", "other"],
      default: "other",
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    requesterName: {
      type: String,
      required: true,
    },

    requesterEmail: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["open", "claimed", "in_progress", "resolved", "closed"],
      default: "open",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    claimedAt: {
      type: Date,
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    messages: {
      type: [messageSchema],
      default: [],
    },

    assignmentHistory: {
      type: [assignmentHistorySchema],
      default: [],
    },
  },
  { timestamps: true },
);

supportRequestSchema.index({ requester: 1, createdAt: -1 });
supportRequestSchema.index({ assignedTo: 1, status: 1 });
supportRequestSchema.index({ status: 1, createdAt: -1 });

const SupportRequest = mongoose.model("SupportRequest", supportRequestSchema);

export default SupportRequest;
