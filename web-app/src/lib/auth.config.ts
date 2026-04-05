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
    authorized({ auth }) {
      return !!auth?.user
    },
  },
} satisfies NextAuthConfig
