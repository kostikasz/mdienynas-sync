import { auth } from "@/lib/auth"
import { verifyTotp } from "@/lib/totp"
import { createOtpCredential } from "@/lib/keycloak/admin"
import { encryptSecret } from "@/lib/crypto"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { secret, code, label } = await req.json() as {
    secret: string
    code:   string
    label?: string
  }

  if (!verifyTotp(secret, code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 })
  }

  await createOtpCredential(session.user.id, secret, label ?? "Authenticator App")

  const encryptedSecret = encryptSecret(secret)
  await prisma.totpCredential.upsert({
    where: { userId: session.user.id },
    update: { encryptedSecret, label: label ?? "Authenticator App" },
    create: { userId: session.user.id, encryptedSecret, label: label ?? "Authenticator App" },
  })

  return NextResponse.json({ ok: true })
}
