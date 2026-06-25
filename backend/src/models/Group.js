import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      minlength: [2, "Group name must be at least 2 characters"],
      maxlength: [80, "Group name must be at most 80 characters"]
    },
    avatar: {
      type: String,
      default: ""
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  { timestamps: true }
);

groupSchema.index({ members: 1, name: 1 });

export const Group = mongoose.model("Group", groupSchema);
