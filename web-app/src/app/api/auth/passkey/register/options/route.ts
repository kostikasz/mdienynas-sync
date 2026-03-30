import { NextResponse } from "next/server"
import { generateRegistrationOptions } from "@simplewebauthn/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const RP_ID     = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID   || "localhost"
const RP_NAME   = process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME || "DienynasSync"

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Exclude already-registered credentials so the authenticator won't offer to overwrite them
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("passkeys")
    .select("credential_id, transports")
    .eq("user_id", user.id)

  const options = await generateRegistrationOptions({
    rpName:           RP_NAME,
    rpID:             RP_ID,
    userName:         user.email ?? user.id,
    userDisplayName:  user.user_metadata?.name ?? user.email ?? user.id,
    userID:           new TextEncoder().encode(user.id),
    attestationType:  "none",
    excludeCredentials: (existing ?? []).map((p) => ({
      id:         p.credential_id as string,
      transports: (p.transports ?? []) as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey:      "preferred",
      userVerification: "preferred",
    },
    supportedAlgorithmIDs: [-7, -257],
  })

  const response = NextResponse.json(options)
  response.cookies.set("pk_reg_challenge", options.challenge, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   300,
    path:     "/",
  })
  return response
}
