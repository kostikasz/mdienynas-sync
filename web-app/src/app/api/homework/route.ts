import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getBearerUserId } from "@/lib/auth/getBearerUserId"
import { prisma } from "@/lib/prisma"

const MAX_BODY_BYTES = 1 * 1024 * 1024

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const session = await auth()
  if (session?.user.id) return session.user.id
  return getBearerUserId(req)
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const snapshot = await prisma.homeworkSnapshot.findFirst({
    where:   { userId },
    orderBy: { generatedAt: "desc" },
  })

  if (!snapshot) return NextResponse.json({ error: "No homework data found" }, { status: 404 })
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

  if (!Array.isArray(body.homework)) {
    return NextResponse.json({ error: "Invalid homework.json format" }, { status: 400 })
  }

  const generatedAt = typeof body.generated_at === "string" && !isNaN(Date.parse(body.generated_at))
    ? new Date(body.generated_at)
    : new Date()

  const snapshot = await prisma.homeworkSnapshot.create({
    data: {
      userId,
      generatedAt,
      source:  typeof body.source === "string" ? body.source : "upload",
      rawJson: body as never,
    },
    select: { id: true },
  })

  return NextResponse.json({ id: snapshot.id, count: (body.homework as unknown[]).length })
}
