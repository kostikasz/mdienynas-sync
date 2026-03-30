import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MAX_BODY_BYTES = 2 * 1024 * 1024 // 2 MB

// GET /api/grades — return latest snapshot for authenticated user
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("grades_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({ error: "No grades data found" }, { status: 404 })
  }

  return NextResponse.json(data)
}

// POST /api/grades — upload a new grades.json snapshot
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (
    !body.metadata || typeof body.metadata !== "object" ||
    !Array.isArray(body.courses)
  ) {
    return NextResponse.json({ error: "Invalid grades.json format" }, { status: 400 })
  }

  const metadata = body.metadata as Record<string, unknown>
  const courses  = body.courses as Array<Record<string, unknown>>

  const scrapedAt = typeof metadata.scraped_at === "string" && !isNaN(Date.parse(metadata.scraped_at))
    ? metadata.scraped_at
    : new Date().toISOString()

  const { data: snapshot, error: snapErr } = await supabase
    .from("grades_snapshots")
    .insert({
      user_id:    user.id,
      scraped_at: scrapedAt,
      term:       typeof metadata.term === "string" ? metadata.term : null,
      raw_json:   body,
    })
    .select("id")
    .single()

  if (snapErr) {
    return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 })
  }

  const courseRows = courses.map((c) => ({
    user_id:            user.id,
    snapshot_id:        snapshot.id,
    course_code:        String(c.id ?? ""),
    name:               String(c.name ?? ""),
    instructor:         c.instructor ? String(c.instructor) : null,
    credits:            c.credits != null ? Number(c.credits) : null,
    current_grade:      c.current_grade ? String(c.current_grade) : null,
    current_percentage: c.current_percentage != null ? Number(c.current_percentage) : null,
    term:               typeof metadata.term === "string" ? metadata.term : null,
  }))

  if (courseRows.length > 0) {
    await supabase.from("courses").insert(courseRows)
  }

  return NextResponse.json({ id: snapshot.id, courses: courseRows.length })
}
