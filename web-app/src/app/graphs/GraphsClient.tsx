"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts"
import type { GradesSnapshot } from "@/types/grades"
import {
  getCourseAverage,
  getGradeColor,
  shortCourseName,
  COURSE_COLORS,
  getNumericGrades,
} from "@/lib/grades"

interface Props {
  grades: GradesSnapshot | null
}

export default function GraphsClient({ grades }: Props) {
  if (!grades) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-[#9a9080]">No grades data. Upload a grades.json first.</p>
      </div>
    )
  }

  const courses = grades.courses

  // Bar chart: average per course
  const courseAvgData = courses
    .map((c, i) => ({
      name:  shortCourseName(c.name, 20),
      avg:   getCourseAverage(c) ?? 0,
      color: COURSE_COLORS[i % COURSE_COLORS.length],
    }))
    .filter((d) => d.avg > 0)
    .sort((a, b) => b.avg - a.avg)

  // Grade distribution across all courses
  const allGrades = courses.flatMap((c) => getNumericGrades(c.assignments))
  const distData = Array.from({ length: 10 }, (_, i) => ({
    grade: String(i + 1),
    count: allGrades.filter((n) => n === i + 1).length,
  })).filter((d) => d.count > 0)

  // Pie: courses with/without numeric grades
  const withGrades    = courses.filter((c) => getNumericGrades(c.assignments).length > 0).length
  const withoutGrades = courses.length - withGrades
  const pieData = [
    { name: "With grades", value: withGrades,    fill: "#bc6c25" },
    { name: "No numeric grades", value: withoutGrades, fill: "#c8b898" },
  ].filter((d) => d.value > 0)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-[#1c1c17]">Graphs</h1>

      {/* Average per course */}
      <section className="bg-white border border-[#e8dfc0] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#7a7060] uppercase tracking-wider mb-6">
          Average Grade per Course
        </h2>
        {courseAvgData.length === 0 ? (
          <p className="text-[#9a9080] text-sm">No numeric grades available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={courseAvgData} margin={{ top: 0, right: 0, left: -20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8dfc0" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#7a7060", fontSize: 11 }}
                angle={-40}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fill: "#7a7060", fontSize: 11 }}
                domain={[0, 10]}
              />
              <Tooltip
                contentStyle={{ background: "#fffdf2", border: "1px solid #e8dfc0", borderRadius: 8 }}
                labelStyle={{ color: "#1c1c17" }}
                itemStyle={{ color: "#bc6c25" }}
                formatter={(v) => [typeof v === "number" ? v.toFixed(2) : v, "Average"]}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {courseAvgData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade distribution */}
        <section className="bg-white border border-[#e8dfc0] rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#7a7060] uppercase tracking-wider mb-6">
            Grade Distribution (All Courses)
          </h2>
          {distData.length === 0 ? (
            <p className="text-[#9a9080] text-sm">No numeric grades.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dfc0" />
                <XAxis dataKey="grade" tick={{ fill: "#7a7060", fontSize: 12 }} />
                <YAxis tick={{ fill: "#7a7060", fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#fffdf2", border: "1px solid #e8dfc0", borderRadius: 8 }}
                  labelStyle={{ color: "#1c1c17" }}
                  itemStyle={{ color: "#bc6c25" }}
                  formatter={(v) => [v, "Count"]}
                />
                <Bar dataKey="count" fill="#bc6c25" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Course coverage pie */}
        <section className="bg-white border border-[#e8dfc0] rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#7a7060] uppercase tracking-wider mb-6">
            Course Coverage
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#fffdf2", border: "1px solid #e8dfc0", borderRadius: 8 }}
                itemStyle={{ color: "#1c1c17" }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#7a7060", fontSize: 12 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Per-course numeric summary table */}
      <section className="bg-white border border-[#e8dfc0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#e8dfc0]">
          <h2 className="text-sm font-semibold text-[#7a7060] uppercase tracking-wider">
            Summary Table
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8dfc0]">
                <th className="text-left px-4 py-3 text-xs text-[#9a9080] font-medium">Course</th>
                <th className="text-center px-4 py-3 text-xs text-[#9a9080] font-medium">Entries</th>
                <th className="text-center px-4 py-3 text-xs text-[#9a9080] font-medium">Numeric</th>
                <th className="text-center px-4 py-3 text-xs text-[#9a9080] font-medium">Min</th>
                <th className="text-center px-4 py-3 text-xs text-[#9a9080] font-medium">Max</th>
                <th className="text-center px-4 py-3 text-xs text-[#9a9080] font-medium">Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8dfc0]">
              {courses.map((course) => {
                const nums = getNumericGrades(course.assignments)
                const avg  = getCourseAverage(course)
                return (
                  <tr key={course.id} className="hover:bg-[#fef8e8]">
                    <td className="px-4 py-3 text-[#1c1c17] text-sm">
                      {shortCourseName(course.name, 45)}
                    </td>
                    <td className="px-4 py-3 text-[#7a7060] text-center">{course.assignments.length}</td>
                    <td className="px-4 py-3 text-[#7a7060] text-center">{nums.length}</td>
                    <td className="px-4 py-3 text-center">
                      {nums.length > 0 ? (
                        <span className={getGradeColor(Math.min(...nums))}>
                          {Math.min(...nums)}
                        </span>
                      ) : "–"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {nums.length > 0 ? (
                        <span className={getGradeColor(Math.max(...nums))}>
                          {Math.max(...nums)}
                        </span>
                      ) : "–"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${getGradeColor(avg)}`}>
                        {avg !== null ? avg.toFixed(2) : "–"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
