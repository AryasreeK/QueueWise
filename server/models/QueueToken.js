import mongoose from "mongoose";

const queueTokenSchema = new mongoose.Schema({
  tokenNumber: { type: String, required: true },
  serviceId: { type: String, required: true },
  serviceName: { type: String, required: true },
  customerName: { type: String, default: "Guest" },
  status: {
    type: String,
    enum: ["waiting", "serving", "completed", "skipped"],
    default: "waiting"
  },
  createdAt: { type: Date, default: Date.now },
  servedAt: Date,
  completedAt: Date
});

export default mongoose.model("QueueToken", queueTokenSchema);
