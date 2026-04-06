import { auth, signOut } from "@/lib/auth"
import { NextResponse } from "next/server"

// Signs out of both NextAuth and Keycloak.
// Keycloak maintains its own session — without hitting its end_session endpoint,
// OAuth re-login skips the Google/provider redirect and auto-logs in silently.
//
// Requires Keycloak client config:
//   mdienynas-web → Valid post logout redirect URIs → add "+" (inherits from Valid redirect URIs)
export async function POST() {
  // Clear the NextAuth session
  await signOut({ redirect: false })

  // Build Keycloak end_session URL.
  // post_logout_redirect_uri must be registered in Keycloak client →
  // "Valid post logout redirect URIs". Setting it to "+" in Keycloak
  // inherits from "Valid redirect URIs" and covers all registered app URLs.
  const issuer   = process.env.KEYCLOAK_ISSUER!
  const clientId = process.env.KEYCLOAK_CLIENT_ID!
  const appUrl   = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "").replace(/\/$/, "")

  const logoutUrl =
    `${issuer}/protocol/openid-connect/logout` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&post_logout_redirect_uri=${encodeURIComponent(appUrl + "/login")}`

  return NextResponse.json({ logoutUrl })
}
