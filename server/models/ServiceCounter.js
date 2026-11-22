import mongoose from "mongoose";

const serviceCounterSchema = new mongoose.Schema({
  serviceId: {
    type: String,
    required: true,
    unique: true,
  },
  lastNumber: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model("ServiceCounter", serviceCounterSchema);
