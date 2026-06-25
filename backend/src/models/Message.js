import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiverId: {
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
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        emoji: String
      }
    ],
    editedAt: {
      type: Date,
      default: null
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedForEveryone: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent"
    }
  },
  { timestamps: true }
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: 1 });

messageSchema.pre("validate", function requireContent(next) {
  if (this.isDeleted || this.deletedForEveryone) return next();

  if (!this.text?.trim() && (!this.attachments || this.attachments.length === 0)) {
    this.invalidate("text", "Message content is required");
  }
  next();
});

export const Message = mongoose.model("Message", messageSchema);
