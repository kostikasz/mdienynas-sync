import { auth, signOut } from "@/lib/auth"
import { NextResponse } from "next/server"

// Signs out of both NextAuth and Keycloak.
// Keycloak maintains its own session — without hitting its end_session endpoint,
// OAuth re-login skips the Google/provider redirect and auto-logs in silently.
export async function POST() {
  const session = await auth()

  // Clear the NextAuth session
  await signOut({ redirect: false })

  // Build Keycloak end_session URL
  const issuer   = process.env.KEYCLOAK_ISSUER!
  const clientId = process.env.KEYCLOAK_CLIENT_ID!
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? ""
  const redirectUri = `${appUrl}/login`

  const keycloakLogoutUrl =
    `${issuer}/protocol/openid-connect/logout` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`

  // If there's an id_token in the session, pass it for RP-initiated logout
  const idToken = (session as { idToken?: string } | null)?.idToken
  const logoutUrl = idToken
    ? `${keycloakLogoutUrl}&id_token_hint=${encodeURIComponent(idToken)}`
    : keycloakLogoutUrl

  return NextResponse.json({ logoutUrl })
}
