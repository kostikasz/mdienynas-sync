import { prisma } from "@/lib/prisma"

export const rpId   = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!
export const rpName = "DienynasSync"
export const origin = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN!

export async function cleanExpiredChallenges(): Promise<void> {
  await prisma.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}
