import mongoose from "mongoose";
import { Group } from "../models/Group.js";
import { Message } from "../models/Message.js";
import { AppError } from "./AppError.js";

export const buildConversationId = (userIdA, userIdB) =>
  [userIdA.toString(), userIdB.toString()].sort().join(":");

export const isPrivateParticipant = (message, userId) =>
  message?.senderId?.toString() === userId.toString() ||
  message?.receiverId?.toString() === userId.toString();

export const assertPrivateParticipant = (message, userId) => {
  if (!isPrivateParticipant(message, userId)) {
    throw new AppError("Forbidden", 403);
  }
};

export const findAuthorizedMessage = async (messageId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new AppError("Invalid message id", 400);
  }

  const message = await Message.findById(messageId);
  if (!message) throw new AppError("Message not found", 404);

  assertPrivateParticipant(message, userId);
  return message;
};

export const assertMessageSender = (message, userId) => {
  if (message.senderId.toString() !== userId.toString()) {
    throw new AppError("Forbidden", 403);
  }
};

export const findAuthorizedReply = async (replyTo, userId, conversationId) => {
  if (!replyTo) return null;
  if (!mongoose.Types.ObjectId.isValid(replyTo)) {
    throw new AppError("Invalid reply message id", 400);
  }

  const reply = await Message.findById(replyTo);
  if (!reply) throw new AppError("Reply message not found", 404);

  assertPrivateParticipant(reply, userId);
  if ((reply.conversationId || buildConversationId(reply.senderId, reply.receiverId)) !== conversationId) {
    throw new AppError("Forbidden", 403);
  }

  return reply._id;
};

export const findAuthorizedGroup = async (groupId, userId, { populateMembers = false } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new AppError("Invalid group id", 400);
  }

  const query = Group.findOne({ _id: groupId, members: userId });
  if (populateMembers) query.populate("members", "-password");

  const group = await query;
  if (!group) throw new AppError("Forbidden", 403);
  return group;
};

export const toAuthorizedMessage = (message) => {
  const plain = typeof message.toObject === "function" ? message.toObject() : { ...message };
  if (plain.attachments?.length) {
    plain.attachments = plain.attachments.map((attachment, index) => ({
      ...attachment,
      secureUrl: `/api/messages/${plain._id}/attachments/${index}`
    }));
  }
  return plain;
};
