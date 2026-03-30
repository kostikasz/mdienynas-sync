import { NextRequest, NextResponse } from "next/server"
import { verifyRegistrationResponse } from "@simplewebauthn/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import type { RegistrationResponseJSON } from "@simplewebauthn/server"

const RP_ID   = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost"
const ORIGIN  = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || `http://localhost:3000`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get("pk_reg_challenge")?.value

  if (!expectedChallenge) {
    return NextResponse.json({ error: "No pending registration challenge" }, { status: 400 })
  }

  let body: { response: RegistrationResponseJSON; friendlyName?: string; useAs2fa?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response:           body.response,
      expectedChallenge,
      expectedOrigin:     ORIGIN,
      expectedRPID:       RP_ID,
      requireUserVerification: false,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 })
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

  // Encode the public key (Uint8Array) as base64url for storage
  const publicKeyB64 = Buffer.from(credential.publicKey).toString("base64url")

  const { error: insertError } = await supabase
    .from("passkeys")
    .insert({
      user_id:       user.id,
      user_email:    user.email ?? "",
      credential_id: credential.id,
      public_key:    publicKeyB64,
      counter:       credential.counter,
      device_type:   credentialDeviceType,
      backed_up:     credentialBackedUp,
      transports:    body.response.response.transports ?? [],
      friendly_name: body.friendlyName?.trim() || null,
      use_as_2fa:    body.useAs2fa ?? false,
    })

  if (insertError) {
    // Duplicate credential_id = already registered
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "This passkey is already registered" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to save passkey" }, { status: 500 })
  }

  const response = NextResponse.json({ verified: true })
  response.cookies.delete("pk_reg_challenge")
  return response
}
