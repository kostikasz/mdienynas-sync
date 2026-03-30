import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/integrations/status — return current connection status for all providers
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  return NextResponse.json({ connected })
}
