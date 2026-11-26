import mongoose from "mongoose";

const queueConfigSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      default: "global",
      unique: true,
    },

    maxWaitingPerService: {
      type: Number,
      default: 50,
      min: 1,
      max: 500,
    },

    ticketExpiryHours: {
      type: Number,
      default: 2,
      min: 1,
      max: 24,
    },

    allowCancellation: {
      type: Boolean,
      default: true,
    },

    operatingHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      openingTime: {
        type: String,
        default: "09:00",
      },
      closingTime: {
        type: String,
        default: "17:00",
      },
      timeZone: {
        type: String,
        default: "Asia/Kolkata",
      },
    },

    notificationsEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const QueueConfig = mongoose.model("QueueConfig", queueConfigSchema);

export default QueueConfig;
