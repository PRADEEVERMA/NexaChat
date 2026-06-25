import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";

export const getAttachmentType = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
};

export const uploadFile = async (file, folder = "nexachat/files") => {
  const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const attachment = {
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    type: getAttachmentType(file.mimetype)
  };

  if (!isCloudinaryConfigured) {
    return { ...attachment, url: base64 };
  }

  const uploadResult = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: "auto"
  });

  return { ...attachment, url: uploadResult.secure_url };
};
