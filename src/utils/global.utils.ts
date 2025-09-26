import crypto from "crypto";

// Generate a secure random token
export function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}