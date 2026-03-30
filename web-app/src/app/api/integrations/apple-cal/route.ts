import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { HomeworkData, HomeworkEntry } from "@/types/homework"

const SUBJECT_COLORS = [
  "#FF2D55", "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA",
  "#007AFF", "#5856D6", "#FF3B30", "#34AADC", "#8E8E93",
]

function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    return new Date(raw).toISOString().split("T")[0].replace(/-/g, "")
  } catch {
    return null
  }
}

function stableUid(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(16).padStart(8, "0") + "@mdienynas-hw"
}

/** Escape text for use in iCalendar property values (RFC 5545 §3.3.11). */
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n|\r/g, "\\n")
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: snapshot } = await supabase
    .from("homework_snapshots")
    .select("raw_json")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single()

  const hw = snapshot?.raw_json as HomeworkData | undefined
  if (!hw) return NextResponse.json({ error: "No homework data found" }, { status: 404 })

  const subjectColors: Record<string, string> = {}
  let colorIdx = 0

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//mdienynas-sync//web-app//LT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Dienynas SYNC Homework",
    "X-WR-TIMEZONE:Europe/Vilnius",
  ]

  for (const entry of hw.homework) {
    const dt = parseDate(entry.due_date ?? entry.assigned_date)
    if (!dt) continue

    if (!subjectColors[entry.subject]) {
      subjectColors[entry.subject] = SUBJECT_COLORS[colorIdx++ % SUBJECT_COLORS.length]
    }
    const color = subjectColors[entry.subject]

    const descParts = [`Subject: ${escapeIcs(entry.subject)}`]
    if (entry.teacher)     descParts.push(`Teacher: ${escapeIcs(entry.teacher)}`)
    if (entry.description) descParts.push(`Task: ${escapeIcs(entry.description)}`)
    if (entry.assigned_date) descParts.push(`Assigned: ${entry.assigned_date.slice(0, 10)}`)

    const summary = escapeIcs(`[HW] ${entry.subject}: ${(entry.description ?? "").slice(0, 60)}`)

    lines.push(
      "BEGIN:VEVENT",
      `UID:${stableUid(entry.id)}`,
      `SUMMARY:${summary}`,
      `DTSTART;VALUE=DATE:${dt}`,
      `DTEND;VALUE=DATE:${dt}`,
      `DESCRIPTION:${descParts.join("\\n")}`,  // \\n is the iCal line-break literal
      `X-APPLE-CALENDAR-COLOR:${color}`,
      "END:VEVENT"
    )
  }

  lines.push("END:VCALENDAR")

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type":        "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="homework.ics"',
    },
  })
}
