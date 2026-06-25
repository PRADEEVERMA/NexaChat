import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cookieOptions, signToken } from "../utils/jwt.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { uploadFile } from "../utils/uploadFile.js";

const sendAuthResponse = (res, user, statusCode = 200) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, cookieOptions);
  res.status(statusCode).json({
    success: true,
    token,
    user: sanitizeUser(user)
  });
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required", 400);
  }

  const avatar = req.file ? (await uploadFile(req.file, "nexachat/avatars")).url : "";
  const user = await User.create({ name, email, password, avatar });
  sendAuthResponse(res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  sendAuthResponse(res, user);
});

export const logout = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", { ...cookieOptions, maxAge: 0 });
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: sanitizeUser(req.user) });
});
