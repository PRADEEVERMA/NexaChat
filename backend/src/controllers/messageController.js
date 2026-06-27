import mongoose from "mongoose";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitToUser } from "../socket/index.js";
import { uploadFile } from "../utils/uploadFile.js";

const validateReceiver = async (receiverId, currentUserId) => {
  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    throw new AppError("Invalid receiver id", 400);
  }

  if (receiverId === currentUserId.toString()) {
    throw new AppError("You cannot message yourself", 400);
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) throw new AppError("Receiver not found", 404);

  return receiver;
};

export const getMessages = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  await validateReceiver(receiverId, req.user._id);

  const messages = await Message.find({
    deletedFor: { $ne: req.user._id },
    $or: [
      { senderId: req.user._id, receiverId },
      { senderId: receiverId, receiverId: req.user._id }
    ]
  })
    .populate("replyTo")
    .sort({ createdAt: 1 });

  res.status(200).json({ success: true, messages });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  const { text = "", replyTo = null } = req.body;
  const files = req.files || [];
  const attachments = await Promise.all(
    files.map((file) => uploadFile(file, "nexachat/messages"))
  );

  if (!text?.trim() && attachments.length === 0) {
    throw new AppError("Message content is required", 400);
  }

  await validateReceiver(receiverId, req.user._id);

  const message = await Message.create({
    senderId: req.user._id,
    receiverId,
    text: text.trim(),
    attachments,
    replyTo: replyTo || null,
    status: "sent"
  });

  emitToUser(receiverId, "message:new", message);

  res.status(201).json({ success: true, message });
});

export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;

  if (!text?.trim()) throw new AppError("Message text is required", 400);

  const message = await Message.findOneAndUpdate(
    { _id: messageId, senderId: req.user._id, deletedForEveryone: false },
    { text: text.trim(), editedAt: new Date() },
    { new: true }
  );

  if (!message) throw new AppError("Message not found", 404);

  emitToUser(message.receiverId, "message:edited", message);
  emitToUser(message.senderId, "message:edited", message);
  emitToUser(message.receiverId, "message-updated", message);
  res.status(200).json({ success: true, message });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const everyone = req.query.everyone === "true";

  const message = await Message.findById(messageId);
  if (!message) throw new AppError("Message not found", 404);

  const isParticipant =
    message.senderId.toString() === req.user._id.toString() ||
    message.receiverId.toString() === req.user._id.toString();

  if (!isParticipant) throw new AppError("Message not found", 404);

  if (everyone && message.senderId.toString() !== req.user._id.toString()) {
    throw new AppError("Only the sender can delete this message for everyone", 403);
  }

  if (everyone) {
    message.isDeleted = true;
    message.deletedForEveryone = true;
    message.text = "";
    message.attachments = [];
    message.deletedAt = new Date();
  } else if (!message.deletedFor.some((id) => id.toString() === req.user._id.toString())) {
    message.deletedFor.push(req.user._id);
  }

  await message.save();

  if (everyone) {
    emitToUser(message.receiverId, "message:deleted", { messageId, everyone, message });
    emitToUser(message.senderId, "message:deleted", { messageId, everyone, message });
    emitToUser(message.receiverId, "message-deleted", { messageId, everyone, message });
    emitToUser(message.senderId, "message-deleted", { messageId, everyone, message });
  } else {
    emitToUser(req.user._id, "message:deleted", { messageId, everyone });
    emitToUser(req.user._id, "message-deleted", { messageId, everyone });
  }

  res.status(200).json({ success: true, messageId, message, everyone });
});

export const reactToMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji) throw new AppError("Choose a reaction", 400);

  const message = await Message.findById(messageId);
  if (!message) throw new AppError("Message not found", 404);

  const isParticipant =
    message.senderId.toString() === req.user._id.toString() ||
    message.receiverId.toString() === req.user._id.toString();

  if (!isParticipant) throw new AppError("Message not found", 404);
  if (message.isDeleted || message.deletedForEveryone) {
    throw new AppError("You cannot react to a deleted message", 400);
  }

  message.reactions = message.reactions.filter(
    (reaction) => reaction.userId.toString() !== req.user._id.toString()
  );
  message.reactions.push({ userId: req.user._id, emoji });
  await message.save();

  emitToUser(message.receiverId, "message:reaction", message);
  emitToUser(message.senderId, "message:reaction", message);
  emitToUser(message.receiverId, "message-updated", message);
  emitToUser(message.senderId, "message-updated", message);

  res.status(200).json({ success: true, message });
});
