import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole } from "@/lib/roles"
import type { GradesSnapshot, Assignment } from "@/types/grades"

const MODEL             = "claude-haiku-4-5-20251001"
const MAX_TOKENS        = 800
const PRO_DAILY_LIMIT   = 5
const FREE_LIFETIME_LIMIT = 1

const SYSTEM_PROMPT = `You are an academic advisor analyzing a student's grades from the Lithuanian school system Mano Dienynas.
Grades are on a 1-10 scale where 10 is the best. "Įsk" means pass, "Neįsk" means fail.
Be concise, encouraging, and specific. Respond in the same language the student's course names are in (Lithuanian if Lithuanian names, English if English).`

function todayUTCStart(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function tomorrowUTCMidnight(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
}

function buildGradesSummary(snapshot: GradesSnapshot): string {
  const lines: string[] = []
  lines.push(`Student: ${snapshot.metadata.student_name ?? "Unknown"}`)
  lines.push(`Term: ${snapshot.metadata.term ?? "Unknown"}`)
  lines.push(`Scraped: ${snapshot.metadata.scraped_at}`)
  lines.push("")
  for (const course of snapshot.courses) {
    lines.push(`Course: ${course.name}`)
    if (course.current_grade)         lines.push(`  Current grade: ${course.current_grade}`)
    if (course.current_percentage != null) lines.push(`  Percentage: ${course.current_percentage}%`)
    const recent: Assignment[] = [...course.assignments]
      .filter((a) => a.score != null)
      .sort((a, b) => {
        const da = a.date ?? a.due_date ?? ""
        const db = b.date ?? b.due_date ?? ""
        return db.localeCompare(da)
      })
      .slice(0, 5)
    if (recent.length > 0) {
      lines.push("  Recent assignments:")
      for (const a of recent) {
        const score = a.max_score != null ? `${a.score}/${a.max_score}` : String(a.score)
        lines.push(`    - ${a.name} (${a.category}): ${score}`)
      }
    }
    lines.push("")
  }
  return lines.join("\n")
}

type Tier = "free" | "pro" | "admin"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = hasRole(session.user.roles, "ADMIN")
  let isPro = false

  if (!isAdmin) {
    const sub = await prisma.subscription.findUnique({
      where:  { userId: session.user.id },
      select: { plan: true, status: true, expiresAt: true },
    })
    isPro = sub?.plan === "pro" && sub?.status === "active" &&
      (sub?.expiresAt === null || sub.expiresAt > new Date())
  }

  const lifetimeUsage = await prisma.aiOverviewUsage.count({ where: { userId: session.user.id } })
  const usageToday    = await prisma.aiOverviewUsage.count({
    where: { userId: session.user.id, usedAt: { gte: todayUTCStart() } },
  })

  const tier: Tier      = isAdmin ? "admin" : isPro ? "pro" : "free"
  const dailyLimit      = isPro ? PRO_DAILY_LIMIT : null
  const canGenerate     = isAdmin
    ? true
    : isPro ? usageToday < PRO_DAILY_LIMIT
    : lifetimeUsage < FREE_LIFETIME_LIMIT

  return NextResponse.json({ tier, lifetimeUsage, usageToday, dailyLimit, canGenerate, upgradeUrl: "/checkout" })
}

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = hasRole(session.user.roles, "ADMIN")
  let isPro = false

  if (!isAdmin) {
    const sub = await prisma.subscription.findUnique({
      where:  { userId: session.user.id },
      select: { plan: true, status: true, expiresAt: true },
    })
    isPro = sub?.plan === "pro" && sub?.status === "active" &&
      (sub?.expiresAt === null || sub.expiresAt > new Date())
  }

  if (!isAdmin) {
    if (isPro) {
      const usageToday = await prisma.aiOverviewUsage.count({
        where: { userId: session.user.id, usedAt: { gte: todayUTCStart() } },
      })
      if (usageToday >= PRO_DAILY_LIMIT) {
        return NextResponse.json({ error: "Daily limit reached", limit: PRO_DAILY_LIMIT, resetAt: tomorrowUTCMidnight() }, { status: 429 })
      }
    } else {
      const lifetime = await prisma.aiOverviewUsage.count({ where: { userId: session.user.id } })
      if (lifetime >= FREE_LIFETIME_LIMIT) {
        return NextResponse.json({ error: "Free tier limit reached", limit: FREE_LIFETIME_LIMIT, upgradeUrl: "/checkout" }, { status: 429 })
      }
    }
  }

  const snapshot = await prisma.gradesSnapshot.findFirst({
    where:   { userId: session.user.id },
    orderBy: { scrapedAt: "desc" },
  })
  if (!snapshot?.rawJson) return NextResponse.json({ error: "No grades data available" }, { status: 400 })

  const gradesSummary = buildGradesSummary(snapshot.rawJson as unknown as GradesSnapshot)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let claudeResponse: Anthropic.Message

  try {
    claudeResponse = await anthropic.messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: `Please analyze these grades and provide a brief, encouraging academic overview with key observations and suggestions:\n\n${gradesSummary}` }],
    })
  } catch (err) {
    console.error("Claude API error:", err)
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 })
  }

  const analysisContent = claudeResponse.content[0]
  const analysis        = analysisContent.type === "text" ? analysisContent.text : ""
  const tokensUsed      = claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens

  await prisma.aiOverviewUsage.create({
    data: { userId: session.user.id, tokensUsed, model: MODEL },
  })

  const usageTodayFinal = await prisma.aiOverviewUsage.count({
    where: { userId: session.user.id, usedAt: { gte: todayUTCStart() } },
  })

  const tier: Tier = isAdmin ? "admin" : isPro ? "pro" : "free"

  return NextResponse.json({ analysis, tier, usageToday: usageTodayFinal, dailyLimit: isPro ? PRO_DAILY_LIMIT : null, tokensUsed })
}
