import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { database_id?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const databaseId = body.database_id?.trim()
  if (!databaseId) return NextResponse.json({ error: "database_id is required" }, { status: 400 })

  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "notion" } },
  })
  if (!integration) return NextResponse.json({ error: "Notion not connected" }, { status: 400 })

  await prisma.integration.update({
    where: { userId_provider: { userId: session.user.id, provider: "notion" } },
    data:  { metadata: { ...(integration.metadata as Record<string, string> ?? {}), database_id: databaseId } },
  })

  return NextResponse.json({ ok: true })
}
