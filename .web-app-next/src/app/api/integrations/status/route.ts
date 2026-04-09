import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await prisma.integration.findMany({
    where:  { userId: session.user.id },
    select: { provider: true, lastSyncedAt: true, connectedAt: true, metadata: true },
  })

  const connected: Record<string, {
    last_synced_at: string | null
    connected_at:   string | null
    metadata:       Record<string, string> | null
  }> = {}

  for (const row of rows) {
    connected[row.provider] = {
      last_synced_at: row.lastSyncedAt?.toISOString() ?? null,
      connected_at:   row.connectedAt?.toISOString()  ?? null,
      metadata:       row.metadata as Record<string, string> | null,
    }
  }

  return NextResponse.json({ connected })
}
