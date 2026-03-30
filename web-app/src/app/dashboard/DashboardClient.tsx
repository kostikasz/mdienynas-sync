"use client"

import { useState } from "react"
import Link from "next/link"
import { Upload, TrendingUp, BookOpen, Clock } from "lucide-react"
import type { GradesSnapshot } from "@/types/grades"
import {
  calcGPA,
  getGradeColor,
  getRecentAssignments,
  getUpcomingAssignments,
  getAssignmentDate,
  formatScore,
  shortCourseName,
  COURSE_COLORS,
  splitScore,
  parseNumericScore,
  calcAverage,
  getNumericGrades,
} from "@/lib/grades"
import type { Course } from "@/types/grades"

/** All individual grade chip values (numeric + įsk/neįsk) for a course */
function getGradeEntries(course: Course): Array<string | number> {
  return course.assignments
    .filter((a) => a.category === "Grade" && a.score !== null)
    .flatMap((a) => splitScore(a.score))
}

/** Count of 'n' (absent/skipped) entries across all assignments */
function getMissedCount(course: Course): number {
  return course.assignments.filter(
    (a) => String(a.score ?? "").toLowerCase() === "n"
  ).length
}

/**
 * If the course only has įsk/neįsk grades, return the majority result.
 * Returns null if there are numeric grades or no įsk/neįsk at all.
 */
function getIskNieskResult(course: Course): "Įsk." | "Neįsk." | null {
  const gradeCells = course.assignments.filter(
    (a) => a.category === "Grade" && a.score !== null
  )
  if (gradeCells.length === 0) return null
  let isk = 0, neisk = 0
  for (const a of gradeCells) {
    const s = String(a.score).toLowerCase()
    if (s === "įsk") isk++
    else if (s === "neįsk") neisk++
  }
  // Only treat as įsk/neįsk if there are no numeric grades mixed in
  const hasNumeric = gradeCells.some((a) =>
    splitScore(a.score).some((v) => parseNumericScore(v) !== null)
  )
  if (hasNumeric || isk + neisk === 0) return null
  return isk >= neisk ? "Įsk." : "Neįsk."
}

function gradeChipClass(val: string | number): string {
  const s = String(val).toLowerCase()
  if (s === "įsk")   return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
  if (s === "neįsk") return "bg-red-500/20 text-red-400 border border-red-500/20"
  const n = Number(val)
  if (isNaN(n))  return "bg-gray-500/20 text-gray-400 border border-gray-500/20"
  if (n >= 9)    return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
  if (n >= 7)    return "bg-blue-500/20 text-blue-400 border border-blue-500/20"
  if (n >= 5)    return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20"
  return "bg-red-500/20 text-red-400 border border-red-500/20"
}

function displayChipLabel(val: string | number): string {
  const s = String(val).toLowerCase()
  if (s === "įsk")   return "Įsk"
  if (s === "neįsk") return "Neįsk"
  return String(val)
}
import GradeBar from "@/components/GradeBar"

interface Props {
  grades:    GradesSnapshot | null
  scrapedAt: string | null
}

export default function DashboardClient({ grades, scrapedAt }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg(null)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res  = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      })
      if (res.ok) {
        setUploadMsg("Uploaded! Refresh to see your grades.")
      } else {
        const err = await res.json()
        setUploadMsg(`Error: ${err.error}`)
      }
    } catch {
      setUploadMsg("Failed to parse file.")
    }
    setUploading(false)
  }

  if (!grades) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div
          className="rounded-2xl p-10 max-w-md w-full"
          style={{ background: "var(--surface)", border: "1px solid var(--bdr)", boxShadow: "var(--shadow)" }}
        >
          <Upload className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--fg)" }}>No grades yet</h2>
          <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
            Upload your <code style={{ color: "var(--accent)" }}>grades.json</code> from the scraper to get started.
          </p>
          <label
            className="cursor-pointer inline-flex items-center gap-2 font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading…" : "Upload grades.json"}
            <input type="file" accept=".json" className="hidden" onChange={handleUpload} />
          </label>
          {uploadMsg && <p className="mt-4 text-sm" style={{ color: "var(--fg-muted)" }}>{uploadMsg}</p>}
        </div>
      </div>
    )
  }

  const courses       = grades.courses
  const gpa           = calcGPA(courses)
  const recentGrades  = getRecentAssignments(courses, 8)
  const upcoming      = getUpcomingAssignments(courses, 30)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--fg)" }}>Dashboard</h1>
          {scrapedAt && (
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
              Last scraped {new Date(scrapedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        <label
          className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--bdr)",
            color: "var(--fg-muted)",
          }}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Uploading…" : "Sync grades.json"}
          <input type="file" accept=".json" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {uploadMsg && (
        <div
          className="text-sm rounded-lg px-4 py-3"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--bdr)",
            color: "var(--fg-muted)",
          }}
        >
          {uploadMsg}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Bendras vidurkis"
          value={gpa !== null ? gpa.toFixed(2) : "–"}
          icon={<TrendingUp className="w-4 h-4" />}
          color={getGradeColor(gpa)}
        />
        <StatCard
          label="Courses"
          value={String(courses.length)}
          icon={<BookOpen className="w-4 h-4" />}
          color="text-blue-400"
        />
        <StatCard
          label="Recent grades"
          value={String(recentGrades.length)}
          icon={<Clock className="w-4 h-4" />}
          color="text-[var(--accent)]"
        />
        <StatCard
          label="Artimiausi darbai"
          value={String(upcoming.length)}
          icon={<Clock className="w-4 h-4" />}
          color="text-yellow-400"
        />
      </div>

      {/* Course cards */}
      <section>
        <h2
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--fg-muted)" }}
        >
          Courses
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map((course, idx) => {
            const numericGrades = getNumericGrades(course.assignments)
            const avg           = calcAverage(numericGrades)
            const iskResult     = getIskNieskResult(course)
            const gradeEntries  = getGradeEntries(course)
            const missed        = getMissedCount(course)
            const color         = COURSE_COLORS[idx % COURSE_COLORS.length]
            // Show last 10 grade chips so the card doesn't overflow
            const visibleChips  = gradeEntries.slice(-10)

            return (
              <Link
                key={course.id}
                href={`/courses/${encodeURIComponent(course.id)}`}
                className="rounded-xl p-4 transition-colors group flex flex-col gap-2"
                style={{ background: "var(--surface)", border: "1px solid var(--bdr)", boxShadow: "var(--shadow)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--accent)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--bdr)")}
              >
                {/* Course name */}
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: color }} />
                  <p
                    className="text-sm font-medium leading-snug transition-colors"
                    style={{ color: "var(--fg)" }}
                  >
                    {shortCourseName(course.name, 50)}
                  </p>
                </div>

                {/* Individual grade chips */}
                {visibleChips.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pl-5">
                    {visibleChips.map((val, i) => (
                      <span
                        key={i}
                        className={`text-xs px-1.5 py-0.5 rounded font-semibold ${gradeChipClass(val)}`}
                      >
                        {displayChipLabel(val)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs pl-5" style={{ color: "var(--fg-muted)" }}>Pažymių nėra</p>
                )}

                {/* Average + missed */}
                <div className="flex items-center justify-between pl-5">
                  <span className={`text-base font-bold ${iskResult ? (iskResult === "Įsk." ? "text-emerald-400" : "text-red-400") : getGradeColor(avg)}`}>
                    {iskResult ?? (avg !== null ? `Vid. ${avg.toFixed(1)}` : "–")}
                  </span>
                  {missed > 0 && (
                    <span className="text-xs text-red-400 font-medium">
                      Praleista: {missed}
                    </span>
                  )}
                </div>

                {/* Grade bar (only for numeric grades) */}
                {avg !== null && <div className="pl-5"><GradeBar value={avg} /></div>}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent grades */}
        <section>
          <h2
            className="text-sm font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--fg-muted)" }}
          >
            Recent Grades
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--bdr)", boxShadow: "var(--shadow)" }}
          >
            {recentGrades.length === 0 ? (
              <p className="text-sm p-4" style={{ color: "var(--fg-muted)" }}>No graded assignments yet.</p>
            ) : (
              <ul>
                {recentGrades.map((a, idx) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={idx > 0 ? { borderTop: "1px solid var(--bdr)" } : {}}
                  >
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="text-sm truncate" style={{ color: "var(--fg)" }}>{a.name}</p>
                      <p className="text-xs truncate" style={{ color: "var(--fg-muted)" }}>{shortCourseName(a.courseName, 40)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold" style={{ color: "var(--fg)" }}>{formatScore(a.score)}</span>
                      {a.max_score && (
                        <span className="text-xs" style={{ color: "var(--fg-muted)" }}>/{a.max_score}</span>
                      )}
                      <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                        {getAssignmentDate(a)?.slice(0, 10)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Upcoming */}
        <section>
          <h2
            className="text-sm font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--fg-muted)" }}
          >
            Artimiausi darbai (30 d.)
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--bdr)", boxShadow: "var(--shadow)" }}
          >
            {upcoming.length === 0 ? (
              <p className="text-sm p-4" style={{ color: "var(--fg-muted)" }}>Artimiausiu metu nėra suplanuotų darbų.</p>
            ) : (
              <ul>
                {upcoming.map((a, idx) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={idx > 0 ? { borderTop: "1px solid var(--bdr)" } : {}}
                  >
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="text-sm truncate" style={{ color: "var(--fg)" }}>{a.name}</p>
                      <p className="text-xs truncate" style={{ color: "var(--fg-muted)" }}>{shortCourseName(a.courseName, 40)}</p>
                    </div>
                    <p className="text-xs shrink-0" style={{ color: "var(--fg-muted)" }}>
                      {getAssignmentDate(a)?.slice(0, 10)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({
  label, value, icon, color,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--bdr)", boxShadow: "var(--shadow)" }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color: "var(--fg-muted)" }}>
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
