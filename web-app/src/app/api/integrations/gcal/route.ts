import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ""
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""
const SCOPES        = "https://www.googleapis.com/auth/calendar.events"

function callbackUrl(origin: string) {
  return `${origin}/api/integrations/gcal/callback`
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!CLIENT_ID) return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 })

  const { origin } = new URL(req.url)
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  callbackUrl(origin),
    response_type: "code",
    scope:         SCOPES,
    access_type:   "offline",
    prompt:        "consent",
    state:         session.user.id,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

export async function DELETE() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.integration.deleteMany({
    where: { userId: session.user.id, provider: "google_calendar" },
  })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "google_calendar" } },
  })
  if (!integration) return NextResponse.json({ error: "Not connected" }, { status: 400 })

  const { origin } = new URL(req.url)
  let accessToken = integration.accessToken

  if (integration.refreshToken) {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: integration.refreshToken,
        grant_type:    "refresh_token",
      }),
    })
    if (tokenRes.ok) {
      const tokens = await tokenRes.json()
      accessToken  = tokens.access_token
      await prisma.integration.update({
        where: { userId_provider: { userId: session.user.id, provider: "google_calendar" } },
        data:  { accessToken },
      })
    }
  }

  const snapshot = await prisma.gradesSnapshot.findFirst({
    where:   { userId: session.user.id },
    orderBy: { scrapedAt: "desc" },
  })
  if (!snapshot?.rawJson) return NextResponse.json({ error: "No grades data found" }, { status: 404 })

  type Assignment = {
    id?: string; name?: string; due_date?: string; category?: string
    score?: number; max_score?: number; status?: string
  }
  type Course = { id?: string; name?: string; assignments?: Assignment[] }
  const grades     = snapshot.rawJson as { courses?: Course[] }
  const calendarId = (integration.metadata as Record<string, string> | null)?.calendar_id ?? "primary"

  let created = 0
  let skipped = 0
  let failed  = 0

  for (const course of grades.courses ?? []) {
    for (const assignment of course.assignments ?? []) {
      if (!assignment.due_date) { skipped++; continue }

      const startDate   = assignment.due_date.slice(0, 10)
      const summary     = `[${course.name ?? course.id ?? "Course"}] ${assignment.name ?? "Assignment"}`
      const description = [
        assignment.category ? `Category: ${assignment.category}` : null,
        assignment.score != null && assignment.max_score != null ? `Score: ${assignment.score}/${assignment.max_score}` : null,
        assignment.status ? `Status: ${assignment.status}` : null,
      ].filter(Boolean).join("\n")

      const eventRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
        method:  "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ summary, description, start: { date: startDate }, end: { date: startDate } }),
      })
      if (eventRes.ok) {
        created++
      } else {
        failed++
      }
    }
  }

  if (failed === 0) {
    await prisma.integration.update({
      where: { userId_provider: { userId: session.user.id, provider: "google_calendar" } },
      data:  { lastSyncedAt: new Date() },
    })
  }

  if (failed > 0) {
    return NextResponse.json({ ok: false, created, skipped, failed }, { status: 207 })
  }
  return NextResponse.json({ ok: true, created, skipped })
}
