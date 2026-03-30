import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { id: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: "Missing passkey id" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("passkeys")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id) // Ensure the user owns this passkey

  if (error) {
    return NextResponse.json({ error: "Failed to remove passkey" }, { status: 500 })
  }

  return NextResponse.json({ removed: true })
}
