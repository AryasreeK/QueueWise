import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    prefix: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    avgMinutes: {
      type: Number,
      required: true,
      min: 1,
      default: 5,
    },

    color: {
      type: String,
      default: "blue",
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;
