import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json() as { id: string }

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }

  // Use deleteMany with userId to ensure ownership (user can only delete their own passkeys)
  await prisma.passkey.deleteMany({ where: { id, userId: session.user.id } })

  return NextResponse.json({ ok: true })
}
