import { auth } from "@/lib/auth"
import { resetPassword } from "@/lib/keycloak/admin"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { currentPassword, newPassword } = await req.json() as {
    currentPassword: string
    newPassword:     string
  }

  // Verify current password via Keycloak ROPC
  const verify = await fetch(
    `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        client_id:     process.env.KEYCLOAK_CLIENT_ID!,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
        grant_type:    "password",
        username:      session.user.email!,
        password:      currentPassword,
        scope:         "openid",
      }),
    }
  )

  if (!verify.ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 })
  }

  await resetPassword(session.user.id, newPassword)
  return NextResponse.json({ ok: true })
}
