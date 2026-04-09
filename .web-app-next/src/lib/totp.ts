import { createHmac, randomBytes } from "crypto"

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function base32Encode(bytes: Buffer): string {
  let result = ""
  let bits   = 0
  let value  = 0
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += BASE32_CHARS[(value >> bits) & 31]
    }
  }
  if (bits > 0) result += BASE32_CHARS[(value << (5 - bits)) & 31]
  return result
}

export function base32Decode(str: string): Buffer {
  const s = str.replace(/=/g, "").toUpperCase()
  let bits  = 0
  let value = 0
  const out: number[] = []
  for (const char of s) {
    const idx = BASE32_CHARS.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((value >> bits) & 255)
    }
  }
  return Buffer.from(out)
}

function totpCode(secret: string, counter: number): string {
  const key     = base32Decode(secret)
  const buf     = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac    = createHmac("sha1", key).update(buf).digest()
  const offset  = hmac[hmac.length - 1] & 0x0f
  const code    =
    ((hmac[offset]     & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) <<  8) |
     (hmac[offset + 3] & 0xff)
  return String(code % 1_000_000).padStart(6, "0")
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20))
}

export function verifyTotp(secret: string, code: string): boolean {
  const clean   = code.replace(/\s/g, "")
  const counter = Math.floor(Date.now() / 1000 / 30)
  return [-1, 0, 1].some((d) => totpCode(secret, counter + d) === clean)
}

export function otpauthUri(secret: string, account: string, issuer: string): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits:    "6",
    period:    "30",
  })
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?${params}`
}
