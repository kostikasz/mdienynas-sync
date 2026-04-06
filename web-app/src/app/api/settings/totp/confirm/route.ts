import { auth } from "@/lib/auth"
import { verifyTotp } from "@/lib/totp"
import { createOtpCredential } from "@/lib/keycloak/admin"
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
  return NextResponse.json({ ok: true })
}
