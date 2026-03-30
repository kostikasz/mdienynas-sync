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

  return { user: fullUser, admin }
}

export async function GET() {
  const caller = await getCallerOrFail()
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await caller.admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users.map((u) => ({
    id:           u.id,
    email:        u.email,
    created_at:   u.created_at,
    banned:       !!u.banned_until && new Date(u.banned_until) > new Date(),
    roles:        (u.app_metadata?.roles ?? []) as string[],
  }))

  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const caller = await getCallerOrFail()
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { email, password } = body as { email?: string; password?: string }
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 })
  }

  const { data, error } = await caller.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    user: {
      id:         data.user.id,
      email:      data.user.email,
      created_at: data.user.created_at,
      banned:     false,
      roles:      [],
    },
  }, { status: 201 })
}
