import { generateRegistrationOptions } from "@simplewebauthn/server"
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rpId, rpName, cleanExpiredChallenges } from "@/lib/webauthn"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const existingPasskeys = await prisma.passkey.findMany({
    where: { userId: session.user.id },
  })

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userName: session.user.email,
    userID: new TextEncoder().encode(session.user.id),
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  })

  await cleanExpiredChallenges()
  await prisma.webAuthnChallenge.create({
    data: {
      challenge: options.challenge,
      userId: session.user.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  })

  return NextResponse.json(options)
}
