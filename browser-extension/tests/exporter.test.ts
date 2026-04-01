import { describe, it, expect } from "vitest"
import { buildGradesJson, buildHomeworkJson } from "../src/lib/exporter"
import type { GradeEntry, HomeworkEntry } from "../src/lib/types"

const GRADE: GradeEntry = {
  type: "Grade",
  subject: "Mathematics",
  content: "Test",
  due_date: "2026-03-28T00:00:00.000Z",
  lesson_id: "42-2026-03-28",
  grade: "9",
  teacher: "Mr. Smith",
}

describe("buildGradesJson", () => {
  it("produces valid metadata with institution and null fields", () => {
    const result = buildGradesJson([GRADE])
    expect(result.metadata.institution).toBe("Mano Dienynas")
    expect(result.metadata.student_id).toBeNull()
    expect(result.metadata.term).toBeNull()
    expect(typeof result.metadata.scraped_at).toBe("string")
  })

  it("groups grades by subject into courses", () => {
    const result = buildGradesJson([GRADE])
    expect(result.courses).toHaveLength(1)
    expect(result.courses[0].name).toBe("Mathematics")
    expect(result.courses[0].assignments).toHaveLength(1)
  })

  it("sets max_score 10 and category Grade for numeric grades", () => {
    const result = buildGradesJson([GRADE])
    const a = result.courses[0].assignments[0]
    expect(a.score).toBe("9")
    expect(a.max_score).toBe(10)
    expect(a.category).toBe("Grade")
    expect(a.status).toBe("graded")
  })

  it("sets max_score null and category Attendance for attendance marks", () => {
    const result = buildGradesJson([{ ...GRADE, grade: "n" }])
    const a = result.courses[0].assignments[0]
    expect(a.max_score).toBeNull()
    expect(a.category).toBe("Attendance")
  })

  it("sets max_score null and category Grade for pass/fail marks", () => {
    const result = buildGradesJson([{ ...GRADE, grade: "įsk" }])
    const a = result.courses[0].assignments[0]
    expect(a.max_score).toBeNull()
    expect(a.category).toBe("Grade")
  })

  it("merges multiple grades from same subject into one course", () => {
    const g2: GradeEntry = { ...GRADE, lesson_id: "42-2026-03-29", grade: "8" }
    const result = buildGradesJson([GRADE, g2])
    expect(result.courses).toHaveLength(1)
    expect(result.courses[0].assignments).toHaveLength(2)
  })

  it("uses 'Grade entry' as name when content is empty", () => {
    const result = buildGradesJson([{ ...GRADE, content: "" }])
    expect(result.courses[0].assignments[0].name).toBe("Grade entry")
  })
})

const HW: HomeworkEntry = {
  subject: "Mathematics",
  lesson_id: "123",
  description: "Do problems",
  assigned_date: "2026-03-27T00:00:00.000Z",
  due_date: "2026-03-30T00:00:00.000Z",
  teacher: "Mr. Smith",
  homework_url: null,
}

describe("buildHomeworkJson", () => {
  it("produces valid homework JSON structure", () => {
    const result = buildHomeworkJson([HW])
    expect(result.source).toBe("extension")
    expect(result.count).toBe(1)
    expect(result.homework).toHaveLength(1)
    expect(typeof result.generated_at).toBe("string")
  })

  it("builds id from lesson_id and assigned date", () => {
    const result = buildHomeworkJson([HW])
    expect(result.homework[0].id).toBe("hw-123-2026-03-27")
  })

  it("falls back to subject in id when lesson_id is null", () => {
    const result = buildHomeworkJson([{ ...HW, lesson_id: null }])
    expect(result.homework[0].id).toBe("hw-Mathematics-2026-03-27")
  })

  it("preserves all fields", () => {
    const result = buildHomeworkJson([HW])
    const h = result.homework[0]
    expect(h.subject).toBe("Mathematics")
    expect(h.teacher).toBe("Mr. Smith")
    expect(h.description).toBe("Do problems")
    expect(h.due_date).toBe("2026-03-30T00:00:00.000Z")
  })
})
