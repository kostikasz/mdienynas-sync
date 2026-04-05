import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getBearerUserId } from "@/lib/auth/getBearerUserId"
import { prisma } from "@/lib/prisma"

const MAX_BODY_BYTES = 2 * 1024 * 1024

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const session = await auth()
  if (session?.user.id) return session.user.id
  return getBearerUserId(req)
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const snapshot = await prisma.gradesSnapshot.findFirst({
    where:   { userId },
    orderBy: { scrapedAt: "desc" },
  })

  if (!snapshot) return NextResponse.json({ error: "No grades data found" }, { status: 404 })
  return NextResponse.json(snapshot)
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  if (!body.metadata || typeof body.metadata !== "object" || !Array.isArray(body.courses)) {
    return NextResponse.json({ error: "Invalid grades.json format" }, { status: 400 })
  }

  const metadata = body.metadata as Record<string, unknown>
  const courses  = body.courses  as Array<Record<string, unknown>>

  const scrapedAt = typeof metadata.scraped_at === "string" && !isNaN(Date.parse(metadata.scraped_at))
    ? new Date(metadata.scraped_at)
    : new Date()

  const snapshot = await prisma.gradesSnapshot.create({
    data: {
      userId,
      scrapedAt,
      term:    typeof metadata.term === "string" ? metadata.term : null,
      rawJson: body,
    },
    select: { id: true },
  })

  if (courses.length > 0) {
    await prisma.course.createMany({
      data: courses.map((c) => ({
        userId,
        snapshotId:        snapshot.id,
        courseCode:        String(c.id ?? ""),
        name:              String(c.name ?? ""),
        instructor:        c.instructor  ? String(c.instructor)  : null,
        credits:           c.credits    != null ? Number(c.credits)    : null,
        currentGrade:      c.current_grade     ? String(c.current_grade)     : null,
        currentPercentage: c.current_percentage != null ? Number(c.current_percentage) : null,
        term:              typeof metadata.term === "string" ? metadata.term : null,
      })),
    })
  }

  return NextResponse.json({ id: snapshot.id, courses: courses.length })
}
