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
  status: {
    type: String,
    enum: ["waiting", "serving", "completed", "skipped"],
    default: "waiting",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  servedAt: Date,
  completedAt: Date,
});

// Prevent duplicate token numbers within a service.
queueTokenSchema.index({ serviceId: 1, tokenNumber: 1 }, { unique: true });

// Allow only one serving token per service.
queueTokenSchema.index(
  { serviceId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "serving" },
    name: "one_serving_token_per_service",
  },
);

// Return "id" to the frontend instead of MongoDB's "_id".
queueTokenSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("QueueToken", queueTokenSchema);
