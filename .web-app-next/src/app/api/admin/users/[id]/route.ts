import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/roles"
import * as kc from "@/lib/keycloak/admin"

async function assertAdmin() {
  const session = await auth()
  if (!session || !hasRole(session.user.roles, "ADMIN")) return null
  return session
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await assertAdmin()
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id }          = await params
  const body            = await request.json()
  const { action, role } = body as { action: string; role?: string }

  if (action === "ban") {
    await kc.disableUser(id)
    return NextResponse.json({ ok: true })
  }

  if (action === "unban") {
    await kc.enableUser(id)
    return NextResponse.json({ ok: true })
  }

  if (action === "addRole" || action === "removeRole") {
    if (!role) return NextResponse.json({ error: "role is required" }, { status: 400 })

    if (action === "removeRole" && role === "ADMIN" && id === caller.user.id) {
      return NextResponse.json({ error: "Cannot remove your own ADMIN role" }, { status: 403 })
    }

    if (action === "addRole") {
      await kc.assignRealmRole(id, role)
    } else {
      await kc.removeRealmRole(id, role)
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await assertAdmin()
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  if (id === caller.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 })
  }

  await kc.deleteUser(id)
  return NextResponse.json({ ok: true })
}
