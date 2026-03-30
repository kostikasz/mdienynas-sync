import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ""
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""
const SCOPES        = "https://www.googleapis.com/auth/calendar.events"

function callbackUrl(origin: string) {
  return `${origin}/api/integrations/gcal/callback`
}

// GET /api/integrations/gcal — initiate OAuth
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!CLIENT_ID) return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 })

  const { origin } = new URL(req.url)
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  callbackUrl(origin),
    response_type: "code",
    scope:         SCOPES,
    access_type:   "offline",
    prompt:        "consent",
    state:         user.id,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

// DELETE /api/integrations/gcal — disconnect
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await supabase.from("integrations").delete().eq("user_id", user.id).eq("provider", "google_calendar")
  return NextResponse.json({ ok: true })
}

// POST /api/integrations/gcal — sync grades → Google Calendar events
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: integration } = await supabase
    .from("integrations")
    .select("access_token, refresh_token, metadata")
    .eq("user_id", user.id)
    .eq("provider", "google_calendar")
    .single()

  if (!integration) return NextResponse.json({ error: "Not connected" }, { status: 400 })

  const { origin } = new URL(req.url)

  // Refresh access token if needed
  let accessToken = integration.access_token
  if (integration.refresh_token) {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: integration.refresh_token,
        grant_type:    "refresh_token",
      }),
    })
    if (tokenRes.ok) {
      const tokens = await tokenRes.json()
      accessToken = tokens.access_token
      await supabase.from("integrations")
        .update({ access_token: accessToken })
        .eq("user_id", user.id)
        .eq("provider", "google_calendar")
    }
  }

  // Get latest grades snapshot
  const { data: snapshot } = await supabase
    .from("grades_snapshots")
    .select("raw_json")
    .eq("user_id", user.id)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single()

  if (!snapshot?.raw_json) return NextResponse.json({ error: "No grades data found" }, { status: 404 })

  type Assignment = {
    id?: string
    name?: string
    due_date?: string
    category?: string
    score?: number
    max_score?: number
    status?: string
  }
  type Course = { id?: string; name?: string; assignments?: Assignment[] }
  const grades = snapshot.raw_json as { courses?: Course[] }
  const calendarId: string = (integration.metadata as Record<string, string> | null)?.calendar_id ?? "primary"

  let created = 0
  let skipped = 0

  for (const course of grades.courses ?? []) {
    for (const assignment of course.assignments ?? []) {
      if (!assignment.due_date) { skipped++; continue }

      const startDate = assignment.due_date.slice(0, 10)
      const summary   = `[${course.name ?? course.id ?? "Course"}] ${assignment.name ?? "Assignment"}`
      const description = [
        assignment.category ? `Category: ${assignment.category}` : null,
        assignment.score != null && assignment.max_score != null
          ? `Score: ${assignment.score}/${assignment.max_score}`
          : null,
        assignment.status ? `Status: ${assignment.status}` : null,
      ].filter(Boolean).join("\n")

      const event = {
        summary,
        description,
        start: { date: startDate },
        end:   { date: startDate },
      }

      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify(event),
      })
      created++
    }
  }

  await supabase.from("integrations")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("provider", "google_calendar")

  return NextResponse.json({ ok: true, created, skipped })
}
