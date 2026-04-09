import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/roles"
import * as kc from "@/lib/keycloak/admin"

async function assertAdmin() {
  const session = await auth()
  if (!session || !hasRole(session.user.roles, "ADMIN")) return null
  return session
}

export async function GET() {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const kcUsers = await kc.listUsers()

  const users = await Promise.all(
    kcUsers.map(async (u) => {
      const roles = await kc.getUserRealmRoles(u.id)
      return {
        id:         u.id,
        email:      u.email ?? u.username,
        created_at: new Date(u.createdTimestamp).toISOString(),
        banned:     !u.enabled,
        roles:      roles.filter((r) => r === "ADMIN" || r === "CLOUD"),
      }
    })
  )

  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { email, password } = body as { email?: string; password?: string }
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 })
  }

  const user = await kc.createUser(email, password)

  return NextResponse.json({
    user: { id: user.id, email: user.email, created_at: new Date().toISOString(), banned: false, roles: [] },
  }, { status: 201 })
}
