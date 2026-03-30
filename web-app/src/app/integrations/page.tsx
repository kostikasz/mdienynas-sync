import { Suspense } from "react"
import AppShell from "@/components/AppShell"
import IntegrationsClient from "./IntegrationsClient"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: integrations } = await supabase
    .from("integrations")
    .select("provider, last_synced_at, connected_at, metadata")
    .eq("user_id", user.id)

  const connected: Record<string, { last_synced_at: string | null; connected_at: string | null; metadata: Record<string, string> | null }> = {}
  for (const row of integrations ?? []) {
    connected[row.provider] = {
      last_synced_at: row.last_synced_at,
      connected_at:   row.connected_at,
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
