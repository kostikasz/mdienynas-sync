import crypto from "node:crypto";

export function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}
