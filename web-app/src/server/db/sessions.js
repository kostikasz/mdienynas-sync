import crypto from "node:crypto";
import { getPool } from "./pool.js";

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession({ userId, token, expiresAt }) {
  const result = await getPool().query(
    "insert into sessions (user_id, token_hash, expires_at) values ($1, $2, $3) returning *",
    [userId, hashToken(token), expiresAt],
  );

  return result.rows[0];
}
