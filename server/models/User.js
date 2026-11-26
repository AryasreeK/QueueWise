import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "staff", "user"],
      default: "user",
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    assignedServices: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

// Only one Super Admin can exist.
userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "superadmin" },
    name: "one_superadmin_only",
  },
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
