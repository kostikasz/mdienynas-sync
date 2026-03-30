import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/integrations/notion/database — save database ID to integration metadata
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { database_id?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const databaseId = body.database_id?.trim()
  if (!databaseId) return NextResponse.json({ error: "database_id is required" }, { status: 400 })

  const { data: integration } = await supabase
    .from("integrations")
    .select("metadata")
    .eq("user_id", user.id)
    .eq("provider", "notion")
    .single()

  if (!integration) return NextResponse.json({ error: "Notion not connected" }, { status: 400 })

  const updatedMetadata = { ...(integration.metadata as Record<string, string> ?? {}), database_id: databaseId }

  const { error: updateError } = await supabase
    .from("integrations")
    .update({ metadata: updatedMetadata })
    .eq("user_id", user.id)
    .eq("provider", "notion")

  if (updateError) return NextResponse.json({ error: "Failed to save" }, { status: 500 })

  return NextResponse.json({ ok: true })
}
