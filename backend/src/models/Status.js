import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      default: "",
      maxlength: [700, "Status text must be at most 700 characters"]
    },
    media: {
      url: String,
      name: String,
      type: {
        type: String,
        enum: ["image", "video", "file"],
        default: "file"
      },
      mimeType: String,
      size: Number
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    }
  },
  { timestamps: true }
);

export const Status = mongoose.model("Status", statusSchema);
