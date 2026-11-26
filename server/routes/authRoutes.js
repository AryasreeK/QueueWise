import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";

import User from "../models/User.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// --------------------------------------------------
// RATE LIMITERS
// --------------------------------------------------

// Maximum 10 login attempts from one IP in 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

// Maximum 5 registrations from one IP in one hour.
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many registration attempts. Please try again later.",
  },
});

// --------------------------------------------------
// JWT TOKEN GENERATION
// --------------------------------------------------

function createToken(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
}

// --------------------------------------------------
// PUBLIC REGISTRATION
// First account becomes Super Admin.
// Subsequent accounts become normal users.
// --------------------------------------------------

router.post("/register", registrationLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Please complete all fields.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length > 80) {
      return res.status(400).json({
        message: "Enter a valid name.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: "Password must contain 8 to 72 characters.",
      });
    }

    const existing = await User.findOne({ email: cleanEmail });

    if (existing) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let assignedRole = "user";

    const alreadyHasSuperAdmin = await User.exists({
      role: "superadmin",
    });

    if (!alreadyHasSuperAdmin) {
      assignedRole = "superadmin";
    }

    let user;

    try {
      user = await User.create({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role: assignedRole,
      });
    } catch (error) {
      // If another registration creates the Super Admin first,
      // retry this registration as a normal user.
      if (error.code === 11000 && error.keyPattern?.role) {
        assignedRole = "user";

        user = await User.create({
          name: cleanName,
          email: cleanEmail,
          password: hashedPassword,
          role: "user",
        });
      } else if (error.code === 11000) {
        return res.status(409).json({
          message: "Email is already registered.",
        });
      } else {
        throw error;
      }
    }

    return res.status(201).json({
      message:
        assignedRole === "superadmin"
          ? "Super Admin account created successfully."
          : "Account created successfully.",
      token: createToken(user),
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Enter email and password.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail,
    }).select("+password");

    if (!user || !user.active) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    return res.json({
      message: "Login successful.",
      token: createToken(user),
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// GET CURRENT LOGGED-IN USER
// --------------------------------------------------

router.get("/me", protect, (req, res) => {
  res.json({
    user: req.user.toJSON(),
  });
});

// --------------------------------------------------
// CREATE ADMIN OR STAFF
// Only Super Admin is allowed.
// --------------------------------------------------

router.post(
  "/create-staff",
  protect,
  allowRoles("superadmin"),
  async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body || {};

      if (!["admin", "staff"].includes(role)) {
        return res.status(400).json({
          message: "Role must be admin or staff.",
        });
      }

      if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          message: "Please complete all fields.",
        });
      }

      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanName || cleanName.length > 80) {
        return res.status(400).json({
          message: "Enter a valid name.",
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          message: "Enter a valid email address.",
        });
      }

      if (password.length < 8 || password.length > 72) {
        return res.status(400).json({
          message: "Password must contain 8 to 72 characters.",
        });
      }

      const existing = await User.findOne({
        email: cleanEmail,
      });

      if (existing) {
        return res.status(409).json({
          message: "Email is already registered.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role,
      });

      return res.status(201).json({
        message: `${role} account created successfully.`,
        user: user.toJSON(),
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "Email is already registered.",
        });
      }

      next(error);
    }
  },
);

export default router;
