import multer from "multer";
import { AppError } from "../utils/AppError.js";

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed"
]);

const fileFilter = (req, file, cb) => {
  const isMedia =
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype.startsWith("audio/");

  if (isMedia || allowedMimeTypes.has(file.mimetype)) return cb(null, true);
  return cb(new AppError("This file type is not supported", 400), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});
