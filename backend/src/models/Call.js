import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["audio", "video"],
      required: true
    },
    status: {
      type: String,
      enum: ["calling", "ringing", "connected", "rejected", "missed", "ended"],
      default: "calling"
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    answeredAt: {
      type: Date,
      default: null
    },
    endedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ receiverId: 1, createdAt: -1 });

export const Call = mongoose.model("Call", callSchema);
