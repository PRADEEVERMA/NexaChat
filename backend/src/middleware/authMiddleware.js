import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyToken } from "../utils/jwt.js";

const getTokenFromRequest = (req) => {
  if (req.cookies?.jwt) return req.cookies.jwt;

  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.split(" ")[1];

  return null;
};

export const protect = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) throw new AppError("Authentication required", 401);

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id);
  if (!user) throw new AppError("User no longer exists", 401);

  req.user = user;
  next();
});
