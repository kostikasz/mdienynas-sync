import { verifyAuthenticationResponse } from "@simplewebauthn/server"
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/server"
import { prisma } from "@/lib/prisma"
import { signToken } from "@/lib/crypto"
import { rpId, origin } from "@/lib/webauthn"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { response, email } = await req.json() as {
    response: AuthenticationResponseJSON
    email: string
  }

  if (!email || !response) {
    return NextResponse.json({ error: "email and response required" }, { status: 400 })
  }

  const challengeRecord = await prisma.webAuthnChallenge.findFirst({
    where: {
      email,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
  })

  if (!challengeRecord) {
    return NextResponse.json({ error: "No valid challenge found" }, { status: 400 })
  }

  await prisma.webAuthnChallenge.delete({ where: { id: challengeRecord.id } })

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
  })

  if (!passkey) {
    return NextResponse.json({ error: "Passkey not found" }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      credential: {
        id: passkey.credentialId,
        publicKey: passkey.publicKey,
        counter: Number(passkey.counter),
        transports: passkey.transports as AuthenticatorTransportFuture[],
      },
    })
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 })
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 })
  }

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter) },
  })

  const passkeyToken = signToken(passkey.userId, "passkey-auth")
  return NextResponse.json({ passkeyToken })
}
