import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppShell from "@/components/AppShell"
import Link from "next/link"
import type { GradesSnapshot } from "@/types/grades"
import {
  getCourseAverage,
  getGradeColor,
  shortCourseName,
  COURSE_COLORS,
} from "@/lib/grades"
import GradeBar from "@/components/GradeBar"

export default async function CoursesPage() {
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
  const courses = grades?.courses ?? []

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1c1c17] mb-6">Courses</h1>
        {courses.length === 0 ? (
          <p className="text-[#9a9080]">No courses found. Upload a grades.json first.</p>
        ) : (
          <div className="space-y-2">
            {courses.map((course, idx) => {
              const avg   = getCourseAverage(course)
              const color = COURSE_COLORS[idx % COURSE_COLORS.length]
              return (
                <Link
                  key={course.id}
                  href={`/courses/${encodeURIComponent(course.id)}`}
                  className="flex items-center gap-4 bg-white border border-[#e8dfc0] rounded-xl px-5 py-4 hover:border-[#dda15e]/60 transition-colors group shadow-sm"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1c1c17] truncate group-hover:text-[#bc6c25] transition-colors">
                      {course.name}
                    </p>
                    <p className="text-xs text-[#9a9080] mt-0.5">
                      {course.assignments.length} grade entries
                      {course.instructor ? ` · ${course.instructor}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 w-24">
                    <p className={`text-lg font-bold ${getGradeColor(avg)}`}>
                      {avg !== null ? avg.toFixed(1) : "–"}
                    </p>
                    <GradeBar value={avg} className="mt-1" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
