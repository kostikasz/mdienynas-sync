import type { GradeEntry, HomeworkEntry, GradesJson, HomeworkJson, Course } from "./types"

const ATTENDANCE_SCORES = new Set(["n", "p", "nn"])
const PASS_FAIL_SCORES = new Set(["įsk", "neįsk"])

export function buildGradesJson(
  entries: GradeEntry[],
  studentName?: string,
  term?: string
): GradesJson {
  const now = new Date().toISOString()
  const coursesMap = new Map<string, Course>()

  for (const entry of entries) {
    if (!coursesMap.has(entry.subject)) {
      coursesMap.set(entry.subject, {
        id: entry.subject,
        name: entry.subject,
        instructor: null,
        credits: null,
        current_grade: null,
        current_percentage: null,
        assignments: [],
        categories: [],
      })
    }

    let category: string
    let maxScore: number | null
    if (ATTENDANCE_SCORES.has(entry.grade)) {
      category = "Attendance"
      maxScore = null
    } else if (PASS_FAIL_SCORES.has(entry.grade)) {
      category = "Grade"
      maxScore = null
    } else {
      category = "Grade"
      maxScore = 10
    }

    coursesMap.get(entry.subject)!.assignments.push({
      id: entry.lesson_id,
      name: entry.content || "Grade entry",
      category,
      score: entry.grade,
      max_score: maxScore,
      date: entry.due_date,
      lesson_id: entry.lesson_id,
      status: "graded",
    })
  }

  return {
    metadata: {
      student_name: studentName ?? null,
      student_id: null,
      institution: "Mano Dienynas",
      scraped_at: now,
      term: term ?? null,
    },
    courses: [...coursesMap.values()],
  }
}

export function buildHomeworkJson(entries: HomeworkEntry[]): HomeworkJson {
  const now = new Date().toISOString()

  const homework = entries.map((entry) => {
    const assigned = (entry.assigned_date ?? now).slice(0, 10)
    const hwId = `hw-${entry.lesson_id ?? entry.subject}-${assigned}`
    return {
      id: hwId,
      subject: entry.subject,
      lesson_id: entry.lesson_id,
      teacher: entry.teacher || null,
      description: entry.description || null,
      assigned_date: entry.assigned_date,
      due_date: entry.due_date,
      homework_url: entry.homework_url,
    }
  })

  return {
    generated_at: now,
    source: "extension",
    count: homework.length,
    homework,
  }
}
