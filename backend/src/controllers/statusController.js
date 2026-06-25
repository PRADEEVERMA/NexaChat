import { Status } from "../models/Status.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFile } from "../utils/uploadFile.js";
import { emitToUser } from "../socket/index.js";
import { User } from "../models/User.js";

export const getStatuses = asyncHandler(async (req, res) => {
  const statuses = await Status.find({ expiresAt: { $gt: new Date() } })
    .populate("userId", "-password")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, statuses });
});

export const createStatus = asyncHandler(async (req, res) => {
  const media = req.file ? await uploadFile(req.file, "nexachat/status") : undefined;
  const status = await Status.create({
    userId: req.user._id,
    text: req.body.text?.trim() || "",
    media,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  const users = await User.find({ _id: { $ne: req.user._id } }).select("_id");
  users.forEach((user) => emitToUser(user._id, "new-status", status));

  res.status(201).json({ success: true, status });
});
