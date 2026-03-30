import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MAX_BODY_BYTES = 1 * 1024 * 1024 // 1 MB

// GET /api/homework — latest homework snapshot for the user
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("homework_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single()

  if (error) return NextResponse.json({ error: "No homework data found" }, { status: 404 })
  return NextResponse.json(data)
}

// POST /api/homework — upload a homework.json
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  if (!Array.isArray(body.homework)) {
    return NextResponse.json({ error: "Invalid homework.json format" }, { status: 400 })
  }

  const generatedAt = typeof body.generated_at === "string" && !isNaN(Date.parse(body.generated_at))
    ? body.generated_at
    : new Date().toISOString()

  const { data, error } = await supabase
    .from("homework_snapshots")
    .insert({
      user_id:      user.id,
      generated_at: generatedAt,
      source:       typeof body.source === "string" ? body.source : "upload",
      raw_json:     body,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 })
  return NextResponse.json({ id: data.id, count: (body.homework as unknown[]).length })
}
