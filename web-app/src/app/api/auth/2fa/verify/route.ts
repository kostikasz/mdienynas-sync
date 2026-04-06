import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { verifyTotp } from "@/lib/totp"
import { decryptSecret, signToken } from "@/lib/crypto"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await req.json() as { code: string }
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code required" }, { status: 400 })
  }

  const totpCred = await prisma.totpCredential.findUnique({
    where: { userId: session.user.id },
  })

  if (!totpCred) {
    return NextResponse.json({ error: "No TOTP credential found" }, { status: 400 })
  }

  // Check lockout before attempting verification
  if (totpCred.lockedUntil && totpCred.lockedUntil > new Date()) {
    const remainingMs = totpCred.lockedUntil.getTime() - Date.now()
    return NextResponse.json({ locked: true, lockedUntilMs: remainingMs }, { status: 429 })
  }

  // Decrypt and verify TOTP code
  const secret = decryptSecret(totpCred.encryptedSecret)
  const valid = verifyTotp(secret, code)

  if (!valid) {
    const newFailedAttempts = totpCred.failedAttempts + 1

    if (newFailedAttempts >= 3) {
      // Lock for 5 minutes, reset counter
      const lockedUntil = new Date(Date.now() + 5 * 60 * 1000)
      await prisma.totpCredential.update({
        where: { userId: session.user.id },
        data: { failedAttempts: 0, lockedUntil },
      })
      return NextResponse.json(
        { error: "Too many attempts", locked: true, lockedUntilMs: 5 * 60 * 1000 },
        { status: 429 }
      )
    }

    await prisma.totpCredential.update({
      where: { userId: session.user.id },
      data: { failedAttempts: newFailedAttempts },
    })
    return NextResponse.json(
      { error: "Invalid code", remaining: 3 - newFailedAttempts },
      { status: 401 }
    )
  }

  // Success: reset lockout state
  await prisma.totpCredential.update({
    where: { userId: session.user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  })

  // Issue mfaCompleteToken
  const mfaCompleteToken = signToken(session.user.id, "mfa-complete")
  return NextResponse.json({ mfaCompleteToken })
}
