import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: [4000, "Message must be at most 4000 characters"]
    },
    attachments: [
      {
        url: String,
        name: String,
        type: {
          type: String,
          enum: ["image", "video", "audio", "file"],
          default: "file"
        },
        mimeType: String,
        size: Number,
        duration: Number
      }
    ],
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent"
    }
  },
  { timestamps: true }
);

groupMessageSchema.index({ groupId: 1, createdAt: 1 });

export const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);
