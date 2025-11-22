import crypto from "crypto";
import { env } from "../config/environment.js"

// Generate a secure random token
export function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

export function generatePhotoLink(filename: string): string {
  if (!filename) {
    return null;
  }
  const baseUrl = env.CLOUDINARY_BASE_URL;
  return `${baseUrl}${filename}`;
}