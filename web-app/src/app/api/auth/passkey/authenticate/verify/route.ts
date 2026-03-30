import { NextRequest, NextResponse } from "next/server"
import { verifyAuthenticationResponse } from "@simplewebauthn/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import type { AuthenticationResponseJSON } from "@simplewebauthn/server"

const RP_ID  = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost"
const ORIGIN = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || `http://localhost:3000`

export async function POST(req: NextRequest) {
  // ── Read state cookie set by /options ───────────────────────────────────────
  const cookieStore = await cookies()
  const rawState    = cookieStore.get("pk_auth_state")?.value

  if (!rawState) {
    return NextResponse.json({ error: "No pending authentication challenge" }, { status: 400 })
  }

  let state: { challenge: string; email: string }
  try {
    state = JSON.parse(Buffer.from(rawState, "base64").toString("utf-8"))
  } catch {
    return NextResponse.json({ error: "Corrupted state cookie" }, { status: 400 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { response: AuthenticationResponseJSON }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const credentialId = body.response.id

  // ── Look up the stored credential ───────────────────────────────────────────
  const admin = createAdminClient()
  const { data: storedPasskey, error: lookupError } = await admin
    .from("passkeys")
    .select("*")
    .eq("credential_id", credentialId)
    .eq("user_email", state.email)
    .single()

  if (lookupError || !storedPasskey) {
    return NextResponse.json({ error: "Credential not found" }, { status: 400 })
  }

  // ── Verify the authentication response ──────────────────────────────────────
  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response:           body.response,
      expectedChallenge:  state.challenge,
      expectedOrigin:     ORIGIN,
      expectedRPID:       RP_ID,
      requireUserVerification: false,
      credential: {
        id:         storedPasskey.credential_id as string,
        publicKey:  Buffer.from(storedPasskey.public_key as string, "base64url"),
        counter:    storedPasskey.counter as number,
        transports: (storedPasskey.transports ?? []) as AuthenticatorTransport[],
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 })
  }

  // ── Update the stored counter (replay-attack prevention) ────────────────────
  await admin
    .from("passkeys")
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq("id", storedPasskey.id)

  // ── Create a Supabase session for the user via admin magic-link token ────────
  // admin.generateLink does NOT send an email — it only generates a token.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type:  "magiclink",
    email: storedPasskey.user_email as string,
    options: { redirectTo: `${ORIGIN}/auth/callback` },
  })

  if (linkError || !linkData.properties) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }

  const response = NextResponse.json({
    verified:      true,
    hashed_token:  linkData.properties.hashed_token,
    email:         storedPasskey.user_email,
  })
  response.cookies.delete("pk_auth_state")
  return response
}
