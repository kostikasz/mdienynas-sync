import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId:     process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer:       process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const realmAccess = (profile as Record<string, unknown>).realm_access as
          | { roles?: string[] }
          | undefined
        token.roles = realmAccess?.roles?.filter(
          (r) => r === "ADMIN" || r === "CLOUD"
        ) ?? []

        const sub   = profile.sub as string
        const email = profile.email as string
        await prisma.user.upsert({
          where:  { id: sub },
          update: { email },
          create: { id: sub, email },
        })
      }
      return token
    },
    async session({ session, token }) {
      session.user.id    = token.sub!
      session.user.email = token.email!
      session.user.roles = (token.roles ?? []) as string[]
      return session
    },
  },
})
