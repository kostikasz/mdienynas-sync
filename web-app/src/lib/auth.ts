import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "@/lib/auth.config"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/crypto"
import { getUserRealmRoles, listCredentials } from "@/lib/keycloak/admin"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email:            { label: "Email",            type: "email"    },
        password:         { label: "Password",         type: "password" },
        passkeyToken:     { label: "Passkey Token",     type: "text"     },
        mfaCompleteToken: { label: "MFA Complete Token", type: "text"    },
      },
      async authorize(credentials) {
        const passkeyToken     = credentials.passkeyToken     as string | undefined
        const mfaCompleteToken = credentials.mfaCompleteToken as string | undefined

        // ─── Case A: passkey login ─────────────────────────────────────────────
        if (passkeyToken) {
          const result = verifyToken(passkeyToken, "passkey-auth")
          if (!result) return null

          const user = await prisma.user.findUnique({ where: { id: result.userId } })
          if (!user) return null

          const totpCred = await prisma.totpCredential.findUnique({
            where: { userId: result.userId },
          })

          const roles = await getUserRealmRoles(result.userId)
          const filteredRoles = roles.filter((r) => r === "ADMIN" || r === "CLOUD")

          return {
            id:         user.id,
            email:      user.email,
            roles:      filteredRoles,
            mfaPending: !!totpCred,
          }
        }

        // ─── Case B: MFA complete (after TOTP success) ─────────────────────────
        if (mfaCompleteToken) {
          const result = verifyToken(mfaCompleteToken, "mfa-complete")
          if (!result) return null

          const user = await prisma.user.findUnique({ where: { id: result.userId } })
          if (!user) return null

          const roles = await getUserRealmRoles(result.userId)
          const filteredRoles = roles.filter((r) => r === "ADMIN" || r === "CLOUD")

          return {
            id:         user.id,
            email:      user.email,
            roles:      filteredRoles,
            mfaPending: false,
          }
        }

        // ─── Case C: password login ────────────────────────────────────────────
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

        // Check for TOTP credential in Prisma
        const totpCred = await prisma.totpCredential.findUnique({ where: { userId: sub } })

        let hasMfa = !!totpCred
        if (!hasMfa) {
          // Keycloak fallback: check for OTP credentials enrolled before TotpCredential was added
          const kcCreds = await listCredentials(sub)
          hasMfa = kcCreds.some((c) => c.type === "otp")
        }

        return { id: sub, email, roles, mfaPending: hasMfa }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.type === "credentials" && user) {
        token.sub        = user.id
        token.email      = user.email ?? undefined
        token.roles      = (user as { roles: string[] }).roles
        token.mfaPending = (user as { mfaPending?: boolean }).mfaPending ?? false
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
      session.user.id         = token.sub!
      session.user.email      = token.email!
      session.user.roles      = (token.roles ?? []) as string[]
      session.user.mfaPending = (token.mfaPending as boolean) ?? false
      return session
    },
  },
})
