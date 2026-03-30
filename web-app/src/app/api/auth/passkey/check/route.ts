import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/auth/passkey/check?email=user@example.com
// Returns { hasPasskey: boolean } — used by the login page to decide whether
// to show the "Sign in with passkey" button.
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ hasPasskey: false })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from("passkeys")
    .select("use_as_2fa")
    .eq("user_email", email.toLowerCase())

  if (error) {
    // Fail silently — don't expose DB errors to the browser
    return NextResponse.json({ hasPasskey: false, has2faPasskey: false })
  }

  const rows = data ?? []
  const hasPasskey    = rows.some((r: { use_as_2fa: boolean }) => !r.use_as_2fa)
  const has2faPasskey = rows.some((r: { use_as_2fa: boolean }) => r.use_as_2fa)
  return NextResponse.json({ hasPasskey, has2faPasskey })
}
