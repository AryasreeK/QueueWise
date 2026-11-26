import mongoose from "mongoose";

const tokenActivitySchema = new mongoose.Schema(
  {
    tokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QueueToken",
      required: true,
      index: true,
    },
    tokenNumber: {
      type: String,
      required: true,
      index: true,
    },
    serviceId: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      default: "Guest",
    },
    action: {
      type: String,
      enum: [
        "generated",
        "called",
        "completed",
        "unskipped",
        "skipped",
        "cancelled",
        "expired",
      ],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    performedByName: {
      type: String,
      default: "Customer",
    },
    performedByRole: {
      type: String,
      default: "user",
    },
    details: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

tokenActivitySchema.index({ createdAt: -1 });

export default mongoose.model("TokenActivity", tokenActivitySchema);
