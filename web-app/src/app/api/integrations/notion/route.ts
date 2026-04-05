import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const NOTION_CLIENT_ID     = process.env.NOTION_CLIENT_ID     ?? ""
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET ?? ""

function callbackUrl(origin: string) {
  return `${origin}/api/integrations/notion/callback`
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!NOTION_CLIENT_ID) return NextResponse.json({ error: "Notion OAuth not configured" }, { status: 500 })

  const { origin } = new URL(req.url)
  const params = new URLSearchParams({
    client_id:     NOTION_CLIENT_ID,
    redirect_uri:  callbackUrl(origin),
    response_type: "code",
    owner:         "user",
    state:         session.user.id,
  })

  return NextResponse.redirect(`https://api.notion.com/v1/oauth/authorize?${params}`)
}

export async function DELETE() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.integration.deleteMany({
    where: { userId: session.user.id, provider: "notion" },
  })
  return NextResponse.json({ ok: true })
}

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "notion" } },
  })
  if (!integration) return NextResponse.json({ error: "Not connected" }, { status: 400 })

  const meta       = integration.metadata as Record<string, string> | null
  const databaseId = meta?.database_id
  if (!databaseId) return NextResponse.json({ error: "No Notion database selected" }, { status: 400 })

  const snapshot = await prisma.gradesSnapshot.findFirst({
    where:   { userId: session.user.id },
    orderBy: { scrapedAt: "desc" },
  })
  if (!snapshot?.rawJson) return NextResponse.json({ error: "No grades data found" }, { status: 404 })

  type Course = {
    id?: string; name?: string; instructor?: string
    credits?: number; current_grade?: string; current_percentage?: number
  }
  const grades      = snapshot.rawJson as { courses?: Course[]; term?: string }
  const accessToken = integration.accessToken
  const headers     = {
    "Authorization":  `Bearer ${accessToken}`,
    "Content-Type":   "application/json",
    "Notion-Version": "2022-06-28",
  }

  let synced = 0
  for (const course of grades.courses ?? []) {
    const properties: Record<string, unknown> = {
      "Course Name": { title: [{ text: { content: course.name ?? course.id ?? "Unknown" } }] },
    }
    if (course.current_grade)      properties["Grade"]       = { select: { name: course.current_grade } }
    if (course.current_percentage != null) properties["Percentage"] = { number: course.current_percentage }
    if (course.credits != null)    properties["Credits"]     = { number: course.credits }
    if (grades.term)               properties["Term"]        = { select: { name: grades.term } }
    properties["Last Updated"] = { date: { start: new Date().toISOString().slice(0, 10) } }

    await fetch("https://api.notion.com/v1/pages", {
      method: "POST", headers,
      body:   JSON.stringify({ parent: { database_id: databaseId }, properties }),
    })
    synced++
  }

  await prisma.integration.update({
    where: { userId_provider: { userId: session.user.id, provider: "notion" } },
    data:  { lastSyncedAt: new Date() },
  })

  return NextResponse.json({ ok: true, synced })
}
