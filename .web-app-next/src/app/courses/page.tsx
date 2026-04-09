import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
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
  const session = await auth()
  if (!session) redirect("/api/auth/signin")

  const snapshot = await prisma.gradesSnapshot.findFirst({
    where:   { userId: session.user.id },
    orderBy: { scrapedAt: "desc" },
  })

  const grades  = snapshot?.rawJson as GradesSnapshot | null
  const courses = grades?.courses ?? []

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-6">Courses</h1>
        {courses.length === 0 ? (
          <p className="text-[var(--fg-muted)]">No courses found. Upload a grades.json first.</p>
        ) : (
          <div className="space-y-2">
            {courses.map((course, idx) => {
              const avg   = getCourseAverage(course)
              const color = COURSE_COLORS[idx % COURSE_COLORS.length]
              return (
                <Link
                  key={course.id}
                  href={`/courses/${encodeURIComponent(course.id)}`}
                  className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--bdr)] rounded-xl px-5 py-4 hover:border-[var(--accent)]/60 transition-colors group shadow-[var(--shadow)]"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)] truncate group-hover:text-[var(--accent)] transition-colors">
                      {course.name}
                    </p>
                    <p className="text-xs text-[var(--fg-muted)] mt-0.5">
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
