import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

const isConfigured =
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret;

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret
  });
}

export { cloudinary, isConfigured as isCloudinaryConfigured };
