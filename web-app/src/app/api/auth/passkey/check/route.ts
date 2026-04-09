import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    // Do NOT reveal "user not found" — return same shape as "no passkeys"
    return NextResponse.json({ hasPasskey: false })
  }

  const count = await prisma.passkey.count({ where: { userId: user.id } })
  return NextResponse.json({ hasPasskey: count > 0 })
}
