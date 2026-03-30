import { NextRequest, NextResponse } from "next/server"
import { generateAuthenticationOptions } from "@simplewebauthn/server"
import { createAdminClient } from "@/lib/supabase/admin"

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost"

export async function POST(req: NextRequest) {
  // mode=2fa → only include keys configured as second factors
  // mode=passwordless (default) → only include keys configured for passwordless
  const mode = req.nextUrl.searchParams.get("mode") === "2fa" ? "2fa" : "passwordless"

  let body: { email: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch passkeys for this email, filtered by mode
  const query = admin
    .from("passkeys")
    .select("credential_id, transports")
    .eq("user_email", email)
    .eq("use_as_2fa", mode === "2fa")

  const { data: passkeys } = await query

  // If no passkeys found, return empty allowCredentials so the browser
  // prompts for any available credential (discoverable / resident key flow)
  const allowCredentials = (passkeys ?? []).map((p) => ({
    id:         p.credential_id as string,
    transports: (p.transports ?? []) as AuthenticatorTransport[],
  }))

  const options = await generateAuthenticationOptions({
    rpID:             RP_ID,
    allowCredentials,
    userVerification: "preferred",
  })

  // Persist challenge + email in a short-lived httpOnly cookie
  const payload = JSON.stringify({ challenge: options.challenge, email })

  const response = NextResponse.json(options)
  response.cookies.set("pk_auth_state", Buffer.from(payload).toString("base64"), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   300,
    path:     "/",
  })
  return response
}
