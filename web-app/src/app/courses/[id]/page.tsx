import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import AppShell from "@/components/AppShell"
import type { GradesSnapshot } from "@/types/grades"
import {
  getCourseAverage,
  getGradeColor,
  formatScore,
  getAssignmentDate,
  getNumericGrades,
  splitScore,
} from "@/lib/grades"
import GradeBar from "@/components/GradeBar"

interface Props {
  params: Promise<{ id: string }>
}

export default async function CoursePage({ params }: Props) {
  const { id } = await params
  const courseId = decodeURIComponent(id)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: snapshot } = await supabase
    .from("grades_snapshots")
    .select("raw_json")
    .eq("user_id", user.id)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single()

  const grades = snapshot?.raw_json as GradesSnapshot | null
  const course = grades?.courses.find((c) => c.id === courseId)
  if (!course) notFound()

  const avg          = getCourseAverage(course)
  const numericGrades = getNumericGrades(course.assignments)

  const sorted = [...course.assignments].sort((a, b) => {
    const da = getAssignmentDate(a) ?? ""
    const db = getAssignmentDate(b) ?? ""
    return db.localeCompare(da)
  })

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs text-[#9a9080] mb-1">
            <a href="/courses" className="hover:text-[#bc6c25] transition-colors">Courses</a>
            {" / "}
          </p>
          <h1 className="text-xl font-bold text-[#1c1c17] leading-snug">{course.name}</h1>
          {course.instructor && <p className="text-sm text-[#7a7060] mt-1">{course.instructor}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-[#e8dfc0] rounded-xl p-4 text-center shadow-sm">
            <p className={`text-3xl font-bold ${getGradeColor(avg)}`}>
              {avg !== null ? avg.toFixed(2) : "–"}
            </p>
            <p className="text-xs text-[#9a9080] mt-1">Average</p>
          </div>
          <div className="bg-white border border-[#e8dfc0] rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-[#1c1c17]">{numericGrades.length}</p>
            <p className="text-xs text-[#9a9080] mt-1">Numeric grades</p>
          </div>
          <div className="bg-white border border-[#e8dfc0] rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-[#1c1c17]">{course.assignments.length}</p>
            <p className="text-xs text-[#9a9080] mt-1">Total entries</p>
          </div>
        </div>

        <GradeBar value={avg} className="h-2" />

        {/* Grade distribution */}
        {numericGrades.length > 0 && (
          <div className="bg-white border border-[#e8dfc0] rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-[#7a7060] uppercase tracking-wider mb-3">Grade Distribution</p>
            <div className="flex items-end gap-1.5 h-16">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => {
                const count = numericGrades.filter((n) => n === g).length
                const maxCount = Math.max(...Array.from({ length: 10 }, (_, i) =>
                  numericGrades.filter((n) => n === i + 1).length
                ))
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0
                return (
                  <div key={g} className="flex flex-col items-center flex-1 gap-1">
                    <div
                      className="w-full rounded-t bg-[#bc6c25]/60"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-[#b0a890]">{g}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Assignment list */}
        <div>
          <p className="text-xs font-semibold text-[#7a7060] uppercase tracking-wider mb-3">All Entries</p>
          <div className="bg-white border border-[#e8dfc0] rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8dfc0]">
                  <th className="text-left px-4 py-3 text-xs text-[#9a9080] font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-xs text-[#9a9080] font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-[#9a9080] font-medium">Category</th>
                  <th className="text-right px-4 py-3 text-xs text-[#9a9080] font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8dfc0]">
                {sorted.map((a) => (
                  <tr key={a.id} className="hover:bg-[#fef8e8]">
                    <td className="px-4 py-3 text-[#9a9080] whitespace-nowrap text-xs">
                      {getAssignmentDate(a)?.slice(0, 10) ?? "–"}
                    </td>
                    <td className="px-4 py-3 text-[#1c1c17]">{a.name}</td>
                    <td className="px-4 py-3 text-[#7a7060]">{a.category}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={getGradeColor(
                        typeof a.score === "number" ? a.score
                          : typeof a.score === "string" ? parseFloat(a.score) || null
                          : null
                      )}>
                        {formatScore(a.score)}
                      </span>
                      {a.max_score && (
                        <span className="text-[#b0a890] text-xs">/{a.max_score}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
