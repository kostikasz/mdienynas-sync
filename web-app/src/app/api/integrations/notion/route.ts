import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const NOTION_CLIENT_ID     = process.env.NOTION_CLIENT_ID     ?? ""
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET ?? ""

function callbackUrl(origin: string) {
  return `${origin}/api/integrations/notion/callback`
}

// GET /api/integrations/notion — initiate OAuth
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!NOTION_CLIENT_ID) return NextResponse.json({ error: "Notion OAuth not configured" }, { status: 500 })

  const { origin } = new URL(req.url)
  const params = new URLSearchParams({
    client_id:     NOTION_CLIENT_ID,
    redirect_uri:  callbackUrl(origin),
    response_type: "code",
    owner:         "user",
    state:         user.id,
  })

  return NextResponse.redirect(`https://api.notion.com/v1/oauth/authorize?${params}`)
}

// DELETE /api/integrations/notion — disconnect
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await supabase.from("integrations").delete().eq("user_id", user.id).eq("provider", "notion")
  return NextResponse.json({ ok: true })
}

// POST /api/integrations/notion — sync courses → Notion database
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: integration } = await supabase
    .from("integrations")
    .select("access_token, metadata")
    .eq("user_id", user.id)
    .eq("provider", "notion")
    .single()

  if (!integration) return NextResponse.json({ error: "Not connected" }, { status: 400 })

  const meta = integration.metadata as Record<string, string> | null
  const databaseId = meta?.database_id
  if (!databaseId) return NextResponse.json({ error: "No Notion database selected" }, { status: 400 })

  // Get latest grades snapshot
  const { data: snapshot } = await supabase
    .from("grades_snapshots")
    .select("raw_json, scraped_at, term")
    .eq("user_id", user.id)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single()

  if (!snapshot?.raw_json) return NextResponse.json({ error: "No grades data found" }, { status: 404 })

  type Course = {
    id?: string
    name?: string
    instructor?: string
    credits?: number
    current_grade?: string
    current_percentage?: number
  }
  const grades = snapshot.raw_json as { courses?: Course[] }
  const accessToken = integration.access_token
  const headers = {
    "Authorization":  `Bearer ${accessToken}`,
    "Content-Type":   "application/json",
    "Notion-Version": "2022-06-28",
  }

  let synced = 0

  for (const course of grades.courses ?? []) {
    const properties: Record<string, unknown> = {
      "Course Name": { title: [{ text: { content: course.name ?? course.id ?? "Unknown" } }] },
    }

    if (course.current_grade) {
      properties["Grade"] = { select: { name: course.current_grade } }
    }
    if (course.current_percentage != null) {
      properties["Percentage"] = { number: course.current_percentage }
    }
    if (course.credits != null) {
      properties["Credits"] = { number: course.credits }
    }
    if (snapshot.term) {
      properties["Term"] = { select: { name: snapshot.term } }
    }
    properties["Last Updated"] = { date: { start: new Date().toISOString().slice(0, 10) } }

    await fetch("https://api.notion.com/v1/pages", {
      method:  "POST",
      headers,
      body:    JSON.stringify({ parent: { database_id: databaseId }, properties }),
    })
    synced++
  }

  await supabase.from("integrations")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("provider", "notion")

  return NextResponse.json({ ok: true, synced })
}
