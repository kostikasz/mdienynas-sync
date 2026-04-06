import { verifyRegistrationResponse } from "@simplewebauthn/server"
import type { RegistrationResponseJSON } from "@simplewebauthn/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rpId, origin } from "@/lib/webauthn"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { response, name } = await req.json() as { response: RegistrationResponseJSON; name?: string }

  const challenge = await prisma.webAuthnChallenge.findFirst({
    where: {
      userId: session.user.id,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
  })

  if (!challenge) {
    return NextResponse.json({ error: "No pending challenge" }, { status: 400 })
  }

  await prisma.webAuthnChallenge.delete({ where: { id: challenge.id } })

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
    })
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 })
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 })
  }

  await prisma.passkey.create({
    data: {
      credentialId: verification.registrationInfo.credential.id,
      publicKey: Buffer.from(verification.registrationInfo.credential.publicKey),
      counter: BigInt(verification.registrationInfo.credential.counter),
      transports: response.response.transports ?? [],
      name: name || "Passkey",
      userId: session.user.id,
    },
  })

  return NextResponse.json({ ok: true })
}
