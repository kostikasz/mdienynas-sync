import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasRole } from "@/lib/roles"
import type { GradesSnapshot, Course, Assignment } from "@/types/grades"

const MODEL = "claude-haiku-4-5-20251001"
const MAX_TOKENS = 800
const PRO_DAILY_LIMIT = 5
const FREE_LIFETIME_LIMIT = 1

const SYSTEM_PROMPT = `You are an academic advisor analyzing a student's grades from the Lithuanian school system Mano Dienynas.
Grades are on a 1-10 scale where 10 is the best. "Įsk" means pass, "Neįsk" means fail.
Be concise, encouraging, and specific. Respond in the same language the student's course names are in (Lithuanian if Lithuanian names, English if English).`

/** UTC start of today (midnight) */
function todayUTCStart(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

/** UTC midnight at start of tomorrow */
function tomorrowUTCMidnight(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
}

/** Build a compact text summary of grades to keep token usage low */
function buildGradesSummary(snapshot: GradesSnapshot): string {
  const lines: string[] = []
  lines.push(`Student: ${snapshot.metadata.student_name ?? "Unknown"}`)
  lines.push(`Term: ${snapshot.metadata.term ?? "Unknown"}`)
  lines.push(`Scraped: ${snapshot.metadata.scraped_at}`)
  lines.push("")

  for (const course of snapshot.courses) {
    lines.push(`Course: ${course.name}`)
    if (course.current_grade) lines.push(`  Current grade: ${course.current_grade}`)
    if (course.current_percentage != null) lines.push(`  Percentage: ${course.current_percentage}%`)

    // Last 5 assignments (most recent by date)
    const recentAssignments: Assignment[] = [...course.assignments]
      .filter((a) => a.score != null)
      .sort((a, b) => {
        const dateA = a.date ?? a.due_date ?? ""
        const dateB = b.date ?? b.due_date ?? ""
        return dateB.localeCompare(dateA)
      })
      .slice(0, 5)

    if (recentAssignments.length > 0) {
      lines.push("  Recent assignments:")
      for (const a of recentAssignments) {
        const score = a.max_score != null ? `${a.score}/${a.max_score}` : String(a.score)
        lines.push(`    - ${a.name} (${a.category}): ${score}`)
      }
    }
    lines.push("")
  }

  return lines.join("\n")
}

type Tier = "free" | "pro" | "admin"

interface UsageInfo {
  tier: Tier
  isPro: boolean
  isAdmin: boolean
  usageToday: number
  lifetimeUsage: number
  dailyLimit: number | null
  canGenerate: boolean
}

async function getUsageInfo(userId: string, isAdmin: boolean, isPro: boolean): Promise<UsageInfo> {
  const supabase = await createClient()

  // Count lifetime usage
  const { count: lifetimeCount } = await supabase
    .from("ai_overview_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  const lifetimeUsage = lifetimeCount ?? 0

  // Count today's usage
  const { count: todayCount } = await supabase
    .from("ai_overview_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("used_at", todayUTCStart())

  const usageToday = todayCount ?? 0

  let tier: Tier = "free"
  let dailyLimit: number | null = null
  let canGenerate = false

  if (isAdmin) {
    tier = "admin"
    dailyLimit = null
    canGenerate = true
  } else if (isPro) {
    tier = "pro"
    dailyLimit = PRO_DAILY_LIMIT
    canGenerate = usageToday < PRO_DAILY_LIMIT
  } else {
    tier = "free"
    dailyLimit = null
    canGenerate = lifetimeUsage < FREE_LIFETIME_LIMIT
  }

  return { tier, isPro, isAdmin, usageToday, lifetimeUsage, dailyLimit, canGenerate }
}

// GET /api/ai/overview — check usage status without generating
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: { user: fullUser } } = await admin.auth.admin.getUserById(user.id)
  const isAdmin = fullUser ? hasRole(fullUser, "ADMIN") : false

  let isPro = false
  if (!isAdmin) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status, expires_at")
      .eq("user_id", user.id)
      .single()

    isPro = sub?.plan === "pro" && sub?.status === "active" &&
      (sub?.expires_at === null || new Date(sub.expires_at) > new Date())
  }

  const usage = await getUsageInfo(user.id, isAdmin, isPro)

  return NextResponse.json({
    tier: usage.tier,
    lifetimeUsage: usage.lifetimeUsage,
    usageToday: usage.usageToday,
    dailyLimit: usage.dailyLimit,
    canGenerate: usage.canGenerate,
    upgradeUrl: "/checkout",
  })
}

// POST /api/ai/overview — generate AI analysis of grades
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get full user record for role check
  const admin = createAdminClient()
  const { data: { user: fullUser } } = await admin.auth.admin.getUserById(user.id)
  const isAdmin = fullUser ? hasRole(fullUser, "ADMIN") : false

  // Check subscription
  let isPro = false
  if (!isAdmin) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status, expires_at")
      .eq("user_id", user.id)
      .single()

    isPro = sub?.plan === "pro" && sub?.status === "active" &&
      (sub?.expires_at === null || new Date(sub.expires_at) > new Date())
  }

  // Rate limit check
  if (!isAdmin) {
    if (isPro) {
      const { count } = await supabase
        .from("ai_overview_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("used_at", todayUTCStart())

      const usageToday = count ?? 0
      if (usageToday >= PRO_DAILY_LIMIT) {
        return NextResponse.json({
          error: "Daily limit reached",
          limit: PRO_DAILY_LIMIT,
          resetAt: tomorrowUTCMidnight(),
        }, { status: 429 })
      }
    } else {
      const { count } = await supabase
        .from("ai_overview_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)

      const lifetimeUsage = count ?? 0
      if (lifetimeUsage >= FREE_LIFETIME_LIMIT) {
        return NextResponse.json({
          error: "Free tier limit reached",
          limit: FREE_LIFETIME_LIMIT,
          upgradeUrl: "/checkout",
        }, { status: 429 })
      }
    }
  }

  // Fetch latest grades snapshot
  const { data: snapshot, error: snapshotError } = await supabase
    .from("grades_snapshots")
    .select("raw_json, scraped_at")
    .eq("user_id", user.id)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single()

  if (snapshotError || !snapshot) {
    return NextResponse.json({ error: "No grades data available" }, { status: 400 })
  }

  // Build compact grades summary for Claude
  const gradesSummary = buildGradesSummary(snapshot.raw_json as GradesSnapshot)

  // Call Claude API
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let claudeResponse: Anthropic.Message
  try {
    claudeResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Please analyze these grades and provide a brief, encouraging academic overview with key observations and suggestions:\n\n${gradesSummary}`,
        },
      ],
    })
  } catch (err) {
    console.error("Claude API error:", err)
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 })
  }

  const analysisContent = claudeResponse.content[0]
  const analysis = analysisContent.type === "text" ? analysisContent.text : ""
  const tokensUsed = claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens

  // Log usage
  await supabase.from("ai_overview_usage").insert({
    user_id: user.id,
    tokens_used: tokensUsed,
    model: MODEL,
  })

  // Get updated usage counts for response
  const { count: todayCountFinal } = await supabase
    .from("ai_overview_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("used_at", todayUTCStart())

  const tier: Tier = isAdmin ? "admin" : isPro ? "pro" : "free"

  return NextResponse.json({
    analysis,
    tier,
    usageToday: todayCountFinal ?? 1,
    dailyLimit: isPro ? PRO_DAILY_LIMIT : null,
    tokensUsed,
  })
}
