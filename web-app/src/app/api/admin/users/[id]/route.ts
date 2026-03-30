import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasRole } from "@/lib/roles"

async function getCallerOrFail() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: { user: fullUser } } = await admin.auth.admin.getUserById(user.id)
  if (!fullUser || !hasRole(fullUser, "ADMIN")) return null

  return { callerId: user.id, admin }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getCallerOrFail()
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const { action, role } = body as { action: string; role?: string }

  if (action === "ban") {
    const { error } = await caller.admin.auth.admin.updateUserById(id, {
      ban_duration: "876600h",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === "unban") {
    const { error } = await caller.admin.auth.admin.updateUserById(id, {
      ban_duration: "none",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === "addRole" || action === "removeRole") {
    if (!role) return NextResponse.json({ error: "role is required" }, { status: 400 })

    // Self-demotion guard: admins cannot remove their own ADMIN role
    if (action === "removeRole" && role === "ADMIN" && id === caller.callerId) {
      return NextResponse.json({ error: "Cannot remove your own ADMIN role" }, { status: 403 })
    }

    // Write to user_roles table — the trigger syncs it to app_metadata automatically
    if (action === "addRole") {
      const { error } = await caller.admin
        .from("user_roles")
        .insert({ user_id: id, role })
      if (error && error.code !== "23505") {  // ignore unique-violation (already has role)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    } else {
      const { error } = await caller.admin
        .from("user_roles")
        .delete()
        .eq("user_id", id)
        .eq("role", role)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getCallerOrFail()
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  if (id === caller.callerId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 })
  }

  const { error } = await caller.admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
