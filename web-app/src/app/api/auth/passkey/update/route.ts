import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/auth/passkey/update
// Body: { id: string, use_as_2fa: boolean }
// Toggles a passkey between passwordless and 2FA mode.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { id: string; use_as_2fa: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { id, use_as_2fa } = body
  if (typeof id !== "string" || typeof use_as_2fa !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("passkeys")
    .update({ use_as_2fa })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: true })
}
