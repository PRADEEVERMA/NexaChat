import mongoose from "mongoose";
import { Group } from "../models/Group.js";
import { GroupMessage } from "../models/GroupMessage.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFile } from "../utils/uploadFile.js";
import { emitToUser, io } from "../socket/index.js";

const ensureMember = async (groupId, userId) => {
  const group = await Group.findOne({ _id: groupId, members: userId }).populate(
    "members",
    "-password"
  );
  if (!group) throw new AppError("Group not found", 404);
  return group;
};

export const getGroups = asyncHandler(async (req, res) => {
  const search = req.query.search?.trim();
  const query = { members: req.user._id };

  if (search) query.name = { $regex: search, $options: "i" };

  const groups = await Group.find(query).populate("members", "-password").sort({ updatedAt: -1 });
  res.status(200).json({ success: true, groups });
});

export const createGroup = asyncHandler(async (req, res) => {
  const { name, members = "[]" } = req.body;
  if (!name?.trim()) throw new AppError("Group name is required", 400);

  const parsedMembers = Array.isArray(members) ? members : JSON.parse(members || "[]");
  const uniqueMembers = Array.from(
    new Set([req.user._id.toString(), ...parsedMembers.filter(mongoose.Types.ObjectId.isValid)])
  );

  const avatar = req.file ? (await uploadFile(req.file, "nexachat/groups")).url : "";
  const group = await Group.create({
    name: name.trim(),
    avatar,
    admin: req.user._id,
    members: uniqueMembers
  });

  uniqueMembers.forEach((memberId) => emitToUser(memberId, "group-created", group));
  res.status(201).json({ success: true, group });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) throw new AppError("Group not found", 404);
  if (group.admin.toString() !== req.user._id.toString()) {
    throw new AppError("Only the group admin can update this group", 403);
  }

  if (req.body.name) group.name = req.body.name.trim();
  if (req.file) group.avatar = (await uploadFile(req.file, "nexachat/groups")).url;
  await group.save();

  group.members.forEach((memberId) => emitToUser(memberId, "group-updated", group));
  res.status(200).json({ success: true, group });
});

export const addMembers = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) throw new AppError("Group not found", 404);
  if (group.admin.toString() !== req.user._id.toString()) {
    throw new AppError("Only the group admin can add members", 403);
  }

  const members = Array.isArray(req.body.members) ? req.body.members : [];
  const uniqueMembers = Array.from(
    new Set([...group.members.map(String), ...members.filter(mongoose.Types.ObjectId.isValid)])
  );
  group.members = uniqueMembers;
  await group.save();

  uniqueMembers.forEach((memberId) => emitToUser(memberId, "group-updated", group));
  res.status(200).json({ success: true, group });
});

export const removeMember = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) throw new AppError("Group not found", 404);
  if (group.admin.toString() !== req.user._id.toString()) {
    throw new AppError("Only the group admin can remove members", 403);
  }

  group.members = group.members.filter((memberId) => memberId.toString() !== req.params.userId);
  await group.save();

  emitToUser(req.params.userId, "group-removed", { groupId: group._id });
  group.members.forEach((memberId) => emitToUser(memberId, "group-updated", group));
  res.status(200).json({ success: true, group });
});

export const getGroupMessages = asyncHandler(async (req, res) => {
  await ensureMember(req.params.groupId, req.user._id);
  const messages = await GroupMessage.find({ groupId: req.params.groupId })
    .populate("senderId", "-password")
    .sort({ createdAt: 1 });

  res.status(200).json({ success: true, messages });
});

export const sendGroupMessage = asyncHandler(async (req, res) => {
  const group = await ensureMember(req.params.groupId, req.user._id);
  const files = req.files || [];
  const attachments = await Promise.all(
    files.map((file) => uploadFile(file, "nexachat/group-messages"))
  );

  if (!req.body.text?.trim() && attachments.length === 0) {
    throw new AppError("Message content is required", 400);
  }

  const message = await GroupMessage.create({
    groupId: group._id,
    senderId: req.user._id,
    text: req.body.text?.trim() || "",
    attachments,
    status: "delivered"
  });

  io.to(`group:${group._id}`).emit("receive-group-message", message);
  group.members
    .filter((memberId) => memberId.toString() !== req.user._id.toString())
    .forEach((memberId) => emitToUser(memberId, "receive-group-message", message));

  res.status(201).json({ success: true, message });
});
