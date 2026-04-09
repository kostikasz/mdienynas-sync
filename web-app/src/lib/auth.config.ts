import type { NextAuthConfig } from "next-auth"
import Keycloak from "next-auth/providers/keycloak"

// Edge-safe config: no Node.js APIs, no Prisma, no Credentials provider.
// Used by the middleware to verify JWT session cookies.
export const authConfig = {
  providers: [
    Keycloak({
      clientId:     process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer:       process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  pages:   { signIn: "/login" },
  session: { strategy: "jwt" as const },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      if (!isLoggedIn) return false

      // If user has pending MFA, only allow /2fa
      const mfaPending = (auth as { user?: { mfaPending?: boolean } })?.user?.mfaPending
      const isOnMfaPage = request.nextUrl.pathname === "/2fa"

      if (mfaPending && !isOnMfaPage) {
        return Response.redirect(new URL("/2fa", request.nextUrl.origin))
      }

      // If user completed MFA and is on /2fa, send to dashboard
      if (!mfaPending && isOnMfaPage) {
        return Response.redirect(new URL("/dashboard", request.nextUrl.origin))
      }

      return true
    },
  },
} satisfies NextAuthConfig
