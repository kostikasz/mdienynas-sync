import { auth } from "@/lib/auth"
import { listFederatedIdentities } from "@/lib/keycloak/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const identities = await listFederatedIdentities(session.user.id)
  return NextResponse.json({ identities })
}
