import type { GradeEntry, HomeworkEntry } from "./types"

function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // dd.mm.yyyy or dd-mm-yyyy
  const dmy = s.match(/^(\d{2})[.\-](\d{2})[.\-](\d{4})$/)
  if (dmy) {
    const d = new Date(Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]))
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  // yyyy-mm-dd or yyyy-mm-dd hh:mm:ss
  const ymd = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (ymd) {
    const d = new Date(`${ymd[1]}T00:00:00Z`)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  return null
}

export function parseGrades(html: string): GradeEntry[] {
  const doc = new DOMParser().parseFromString(html, "text/html")

  // Build group_id → {subject, teacher} map — mirrors parser.py logic exactly
  const subjects = new Map<string, { subject: string; teacher: string }>()
  for (const td of doc.querySelectorAll("td.mark_subject")) {
    const groupId = td.getAttribute("data-group-id")
    if (!groupId) continue
    let name = td.getAttribute("title") ?? td.textContent?.trim() ?? ""
    name = name.replace(/\s*\(-\)\s*\w+\s*$/, "").trim()
    const teacherA = td.querySelector("a")
    const teacher = teacherA?.textContent?.trim() ?? ""
    subjects.set(groupId, { subject: name, teacher })
  }

  const entries: GradeEntry[] = []

  for (const cell of doc.querySelectorAll("td.td-class-mark")) {
    const cellId = cell.getAttribute("id") ?? ""
    const m = cellId.match(/^td-(\d{4}-\d{2}-\d{2})-(\d+)$/)
    if (!m) continue
    const dateStr = m[1]
    const groupId = m[2]
    const info = subjects.get(groupId) ?? { subject: "", teacher: "" }

    const allSpans = [...cell.querySelectorAll("span")]
    const valueSpans = allSpans.filter((s) => /span-mark-value/.test(s.className))
    const infoSpan = allSpans.find((s) => /span-mark-info/.test(s.className))
    const gradeInfo = infoSpan?.textContent?.trim() ?? ""

    let gradeVals = valueSpans
      .map((s) => s.textContent?.trim() ?? "")
      .filter(Boolean)
    if (gradeVals.length === 0) {
      if (gradeInfo) gradeVals = [gradeInfo]
      else continue
    }

    for (let idx = 0; idx < gradeVals.length; idx++) {
      const suffix = gradeVals.length > 1 ? `-${idx}` : ""
      entries.push({
        type: "Grade",
        subject: info.subject,
        content: idx === 0 ? gradeInfo : "",
        due_date: parseDate(dateStr),
        lesson_id: `${groupId}-${dateStr}${suffix}`,
        grade: gradeVals[idx],
        teacher: info.teacher,
      })
    }
  }

  return entries
}

export function parseHomework(html: string): HomeworkEntry[] {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const entries: HomeworkEntry[] = []

  for (const row of doc.querySelectorAll("tr.simple_info_block")) {
    const cols = row.querySelectorAll("td")
    if (cols.length < 6) continue
    const subject = cols[1].textContent?.trim() ?? ""
    const lessonId = cols[1].getAttribute("data-lesson-id")
    const teacher = cols[2].textContent?.trim() ?? ""
    const description = cols[3].textContent?.trim() ?? ""
    const dueDate = parseDate(cols[4].textContent?.trim() ?? "")
    const assignedDate = parseDate(cols[5].textContent?.trim() ?? "")
    const btn = row.querySelector("a.do-homework-btn")
    const hwUrl = btn?.getAttribute("href") ?? null

    if (subject) {
      entries.push({
        subject,
        lesson_id: lessonId ?? null,
        description: description || null,
        assigned_date: assignedDate,
        due_date: dueDate,
        teacher: teacher || null,
        homework_url: hwUrl,
      })
    }
  }

  return entries
}
