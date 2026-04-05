import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import AppShell from "@/components/AppShell"
import IntegrationsClient from "./IntegrationsClient"

export default async function IntegrationsPage() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")

  const rows = await prisma.integration.findMany({
    where:  { userId: session.user.id },
    select: { provider: true, lastSyncedAt: true, connectedAt: true, metadata: true },
  })

  const connected: Record<string, { last_synced_at: string | null; connected_at: string | null; metadata: Record<string, string> | null }> = {}
  for (const row of rows) {
    connected[row.provider] = {
      last_synced_at: row.lastSyncedAt?.toISOString() ?? null,
      connected_at:   row.connectedAt?.toISOString()  ?? null,
      metadata:       row.metadata as Record<string, string> | null,
    }
  }

  return (
    <AppShell>
      <Suspense>
        <IntegrationsClient connected={connected} />
      </Suspense>
    </AppShell>
  )
}
