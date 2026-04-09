import { getPool } from "./pool.js";
import { hashToken } from "./sessions.js";

export async function createEmailVerificationToken({ userId, token, expiresAt }) {
  const result = await getPool().query(
    "insert into email_verification_tokens (user_id, token_hash, expires_at) values ($1, $2, $3) returning *",
    [userId, hashToken(token), expiresAt],
  );

  return result.rows[0];
}

export async function consumeEmailVerificationToken(token) {
  const tokenHash = hashToken(token);
  const result = await getPool().query(
    `update email_verification_tokens
     set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now()
     returning *`,
    [tokenHash],
  );

  return result.rows[0] || null;
}

export async function createPasswordResetToken({ userId, token, expiresAt }) {
  const result = await getPool().query(
    "insert into password_reset_tokens (user_id, token_hash, expires_at) values ($1, $2, $3) returning *",
    [userId, hashToken(token), expiresAt],
  );

  return result.rows[0];
}

export async function createOneTimeLoginToken({ userId, token, expiresAt }) {
  const result = await getPool().query(
    "insert into one_time_login_tokens (user_id, token_hash, expires_at) values ($1, $2, $3) returning *",
    [userId, hashToken(token), expiresAt],
  );

  return result.rows[0];
}

export async function consumePasswordResetToken(token) {
  const tokenHash = hashToken(token);
  const result = await getPool().query(
    `update password_reset_tokens
     set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now()
     returning *`,
    [tokenHash],
  );

  return result.rows[0] || null;
}

export async function consumeOneTimeLoginToken(token) {
  const tokenHash = hashToken(token);
  const result = await getPool().query(
    `update one_time_login_tokens
     set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now()
     returning *`,
    [tokenHash],
  );

  return result.rows[0] || null;
}

export async function findPasswordResetToken(token) {
  const tokenHash = hashToken(token);
  const result = await getPool().query(
    `select *
     from password_reset_tokens
     where token_hash = $1 and used_at is null and expires_at > now()`,
    [tokenHash],
  );

  return result.rows[0] || null;
}

export async function deleteSessionsForUser(userId) {
  await getPool().query("delete from sessions where user_id = $1", [userId]);
}

export async function findSessionByToken(token) {
  const result = await getPool().query(
    `select s.*, u.email, u.is_confirmed
     from sessions s
     join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );

  return result.rows[0] || null;
}

export async function deleteSessionByToken(token) {
  await getPool().query("delete from sessions where token_hash = $1", [hashToken(token)]);
}
