import { generateAuthenticationOptions } from "@simplewebauthn/server"
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server"
import { prisma } from "@/lib/prisma"
import { rpId, cleanExpiredChallenges } from "@/lib/webauthn"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { email } = await req.json() as { email: string }

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null
  const userPasskeys = user
    ? await prisma.passkey.findMany({ where: { userId: user.id } })
    : []

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    userVerification: "preferred",
    allowCredentials: userPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports as AuthenticatorTransportFuture[],
    })),
  })

  await cleanExpiredChallenges()
  await prisma.webAuthnChallenge.create({
    data: {
      challenge: options.challenge,
      email,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  })

  return NextResponse.json(options)
}
