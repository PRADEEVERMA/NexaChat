import { Call } from "../models/Call.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getCallHistory = asyncHandler(async (req, res) => {
  const calls = await Call.find({
    $or: [{ callerId: req.user._id }, { receiverId: req.user._id }]
  })
    .populate("callerId receiverId", "-password")
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({ success: true, calls });
});
