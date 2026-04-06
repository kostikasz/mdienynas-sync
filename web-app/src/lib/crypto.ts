import { createHmac, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto"

const HMAC_SECRET = process.env.PASSKEY_HMAC_SECRET!

interface TokenPayload {
  userId: string
  purpose: "passkey-auth" | "mfa-complete"
  iat: number
  exp: number
}

export function signToken(userId: string, purpose: TokenPayload["purpose"], ttlSeconds = 30): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: TokenPayload = { userId, purpose, iat: now, exp: now + ttlSeconds }
  const data = JSON.stringify(payload)
  const sig = createHmac("sha256", HMAC_SECRET).update(data).digest("base64url")
  // Format: base64url(payload).base64url(hmac)
  return Buffer.from(data).toString("base64url") + "." + sig
}

export function verifyToken(token: string, expectedPurpose: TokenPayload["purpose"]): { userId: string } | null {
  const parts = token.split(".")
  if (parts.length !== 2) return null

  const [payloadB64, sigB64] = parts
  const data = Buffer.from(payloadB64, "base64url").toString()

  // Verify HMAC using timing-safe comparison
  const expectedSig = createHmac("sha256", HMAC_SECRET).update(data).digest("base64url")
  if (!timingSafeEqual(Buffer.from(sigB64), Buffer.from(expectedSig))) return null

  const payload: TokenPayload = JSON.parse(data)

  // Check purpose
  if (payload.purpose !== expectedPurpose) return null

  // Check expiry
  const now = Math.floor(Date.now() / 1000)
  if (now > payload.exp) return null

  return { userId: payload.userId }
}

function getEncryptionKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY!
  return Buffer.from(hex, "hex") // 32 bytes
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: iv:authTag:ciphertext (all base64)
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":")
}

export function decryptSecret(stored: string): string {
  const key = getEncryptionKey()
  const [ivB64, authTagB64, ciphertextB64] = stored.split(":")
  const iv = Buffer.from(ivB64, "base64")
  const authTag = Buffer.from(authTagB64, "base64")
  const ciphertext = Buffer.from(ciphertextB64, "base64")
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext) + decipher.final("utf8")
}
