import type { Course, Assignment } from "@/types/grades"

const SCORE_LABELS: Record<string, string> = {
  įsk:  "Įsk.",
  n:    "N",
  nn:   "NN",
  p:    "P",
  np:   "NP",
}

export function formatScore(raw: string | number | null): string {
  if (raw === null || raw === undefined) return "–"
  const s = String(raw)
  return SCORE_LABELS[s.toLowerCase()] ?? s
}

export function parseNumericScore(raw: string | number | null): number | null {
  if (raw === null || raw === undefined) return null
  const n = Number(raw)
  return isNaN(n) ? null : n
}

/**
 * Split concatenated Lithuanian scores like "810" → [8, 10].
 */
export function splitScore(raw: string | number | null): Array<string | number> {
  if (raw === null) return []
  const s = String(raw)
  const val = parseInt(s, 10)
  if (isNaN(val) || val >= 1 && val <= 10) return [raw]

  for (let i = 1; i < s.length; i++) {
    const a = parseInt(s.slice(0, i), 10)
    const b = parseInt(s.slice(i), 10)
    if (a >= 1 && a <= 10 && b >= 1 && b <= 10) return [a, b]
  }
  return [raw]
}

export function getNumericGrades(assignments: Assignment[]): number[] {
  return assignments
    .filter((a) => a.category === "Grade" && a.score !== null)
    .flatMap((a) => splitScore(a.score))
    .map((s) => parseNumericScore(s))
    .filter((n): n is number => n !== null)
}

export function calcAverage(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
}

export function getCourseAverage(course: Course): number | null {
  return calcAverage(getNumericGrades(course.assignments))
}

export function getGradeColor(avg: number | null): string {
  if (avg === null) return "text-gray-400"
  if (avg >= 9) return "text-emerald-400"
  if (avg >= 7) return "text-blue-400"
  if (avg >= 5) return "text-yellow-400"
  return "text-red-400"
}

export function getGradeBgColor(avg: number | null): string {
  if (avg === null) return "bg-gray-700"
  if (avg >= 9) return "bg-emerald-500"
  if (avg >= 7) return "bg-blue-500"
  if (avg >= 5) return "bg-yellow-500"
  return "bg-red-500"
}

export function getAssignmentDate(a: Assignment): string | null {
  return a.date ?? a.due_date ?? null
}

export function getRecentAssignments(courses: Course[], limit = 10): Array<Assignment & { courseName: string }> {
  return courses
    .flatMap((c) =>
      c.assignments.map((a) => ({ ...a, courseName: c.name }))
    )
    .filter((a) => a.score !== null)
    .sort((a, b) => {
      const da = getAssignmentDate(a) ?? ""
      const db = getAssignmentDate(b) ?? ""
      return db.localeCompare(da)
    })
    .slice(0, limit)
}

export function getUpcomingAssignments(
  courses: Course[],
  days = 7
): Array<Assignment & { courseName: string }> {
  const now  = new Date()
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  return courses
    .flatMap((c) =>
      c.assignments.map((a) => ({ ...a, courseName: c.name }))
    )
    .filter((a) => {
      const d = getAssignmentDate(a)
      if (!d) return false
      const dt = new Date(d)
      return dt >= now && dt <= cutoff
    })
    .sort((a, b) => {
      const da = getAssignmentDate(a) ?? ""
      const db = getAssignmentDate(b) ?? ""
      return da.localeCompare(db)
    })
}

export function calcGPA(courses: Course[]): number | null {
  const avgs = courses
    .map((c) => getCourseAverage(c))
    .filter((n): n is number => n !== null)
  return calcAverage(avgs)
}

export function shortCourseName(name: string, maxLen = 30): string {
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 1) + "…"
}

export const COURSE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#a78bfa",
]
