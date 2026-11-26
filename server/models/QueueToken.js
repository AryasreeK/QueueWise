import mongoose from "mongoose";

const queueTokenSchema = new mongoose.Schema({
  tokenNumber: {
    type: String,
    required: true,
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
  recoveryPinHash: {
    type: String,
    select: false,
  },
  status: {
    type: String,
    enum: [
      "waiting",
      "serving",
      "completed",
      "skipped",
      "cancelled",
      "expired",
    ],
    default: "waiting",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: Date,
  servedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
});

queueTokenSchema.index({ serviceId: 1, tokenNumber: 1 }, { unique: true });

queueTokenSchema.index(
  { serviceId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "serving" },
    name: "one_serving_token_per_service",
  },
);

queueTokenSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.recoveryPinHash;
    return ret;
  },
});

export default mongoose.model("QueueToken", queueTokenSchema);
