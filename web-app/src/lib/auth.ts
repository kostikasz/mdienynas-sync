import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "@/lib/auth.config"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(
          `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body:    new URLSearchParams({
              client_id:     process.env.KEYCLOAK_CLIENT_ID!,
              client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
              grant_type:    "password",
              username:      String(credentials.email),
              password:      String(credentials.password),
              scope:         "openid email profile",
            }),
          }
        )

        if (!res.ok) return null

        const tokens = await res.json()
        const payload = JSON.parse(
          Buffer.from(tokens.access_token.split(".")[1], "base64url").toString()
        )

        const sub   = payload.sub   as string
        const email = payload.email as string
        const roles = ((payload.realm_access?.roles ?? []) as string[]).filter(
          (r) => r === "ADMIN" || r === "CLOUD"
        )

        await prisma.user.upsert({
          where:  { id: sub },
          update: { email },
          create: { id: sub, email },
        })

        return { id: sub, email, roles }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.type === "credentials" && user) {
        token.sub   = user.id
        token.email = user.email ?? undefined
        token.roles = (user as { roles: string[] }).roles
      } else if (account && profile) {
        const realmAccess = (profile as Record<string, unknown>).realm_access as
          | { roles?: string[] }
          | undefined
        token.roles = realmAccess?.roles?.filter(
          (r) => r === "ADMIN" || r === "CLOUD"
        ) ?? []

        const sub   = profile.sub as string
        const email = profile.email as string

        try {
          await prisma.user.upsert({
            where:  { id: sub },
            update: { email },
            create: { id: sub, email },
          })
        } catch (e: unknown) {
          // P2002: email unique constraint — a DB user already exists with this email
          // under a different Keycloak sub (e.g. email/password account vs Google account).
          // Use the existing record's ID so the user's data remains accessible.
          if ((e as { code?: string })?.code === "P2002") {
            const existing = await prisma.user.findUnique({ where: { email } })
            if (existing) token.sub = existing.id
          } else {
            throw e
          }
        }
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
