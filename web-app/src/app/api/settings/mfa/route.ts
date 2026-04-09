import { auth } from "@/lib/auth"
import { listCredentials } from "@/lib/keycloak/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const creds = await listCredentials(session.user.id)
  const totp  = creds.filter((c) => c.type === "otp").map((c) => ({
    id:          c.id,
    userLabel:   c.userLabel ?? "Authenticator App",
    createdDate: c.createdDate,
  }))
  return NextResponse.json({ totp })
}
