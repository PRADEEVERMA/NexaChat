import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [60, "Name must be at most 60 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false
    },
    avatar: {
      type: String,
      default: ""
    },
    bio: {
      type: String,
      default: "Available",
      maxlength: [140, "Bio must be at most 140 characters"]
    },
    privacy: {
      lastSeen: {
        type: String,
        enum: ["everyone", "nobody"],
        default: "everyone"
      },
      online: {
        type: String,
        enum: ["everyone", "nobody"],
        default: "everyone"
      },
      readReceipts: {
        type: Boolean,
        default: true
      }
    },
    notifications: {
      sound: {
        type: Boolean,
        default: true
      },
      desktop: {
        type: Boolean,
        default: true
      }
    },
    appearance: {
      theme: {
        type: String,
        enum: ["dark", "light"],
        default: "dark"
      },
      wallpaper: {
        type: String,
        default: ""
      }
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
