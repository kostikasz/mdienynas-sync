import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ""
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code    = searchParams.get("code")
  const userId  = searchParams.get("state")
  const errParam = searchParams.get("error")

  if (errParam || !code || !userId) {
    return NextResponse.redirect(new URL("/integrations?error=gcal_denied", origin))
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  `${origin}/api/integrations/gcal/callback`,
      grant_type:    "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/integrations?error=gcal_token", origin))
  }

  const tokens = await tokenRes.json()

  // Store tokens in integrations table using admin client (no session in callback)
  const supabase = createAdminClient()
  await supabase.from("integrations").upsert({
    user_id:       userId,
    provider:      "google_calendar",
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    connected_at:  new Date().toISOString(),
    metadata:      { calendar_id: "primary" },
  }, { onConflict: "user_id,provider" })

  return NextResponse.redirect(new URL("/integrations?connected=gcal", origin))
}
