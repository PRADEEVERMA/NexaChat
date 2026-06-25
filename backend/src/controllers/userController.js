import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";

const parseMaybeJson = (value) => {
  if (!value || typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const getUsers = asyncHandler(async (req, res) => {
  const search = req.query.search?.trim();
  const query = {
    _id: { $nin: [req.user._id] },
    email: { $ne: "nexabot@nexachat.local" }
  };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  const users = await User.find(query).select("-password").sort({ isOnline: -1, name: 1 });
  const sanitizedUsers = users.map((user) => sanitizeUser(user));

  const dedupedUsers = Array.from(
    new Map(sanitizedUsers.map((user) => [user._id.toString(), user])).values()
  ).filter((user) => user._id.toString() !== req.user._id.toString());

  res.status(200).json({ success: true, users: dedupedUsers });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) throw new AppError("User not found", 404);

  res.status(200).json({ success: true, user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updates = {};

  if (req.body.name) updates.name = req.body.name.trim();
  if (req.body.bio !== undefined) updates.bio = req.body.bio.trim();
  const privacy = parseMaybeJson(req.body.privacy);
  const notifications = parseMaybeJson(req.body.notifications);
  const appearance = parseMaybeJson(req.body.appearance);

  if (privacy && typeof privacy === "object") updates.privacy = { ...req.user.privacy, ...privacy };
  if (notifications && typeof notifications === "object") {
    updates.notifications = { ...req.user.notifications, ...notifications };
  }
  if (appearance && typeof appearance === "object") updates.appearance = { ...req.user.appearance, ...appearance };

  if (req.file) {
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    if (isCloudinaryConfigured) {
      const uploadResult = await cloudinary.uploader.upload(base64, {
        folder: "nexachat/avatars",
        resource_type: "image",
        transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face" }]
      });
      updates.avatar = uploadResult.secure_url;
    } else {
      updates.avatar = base64;
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true
  });

  res.status(200).json({ success: true, user: sanitizeUser(user) });
});
