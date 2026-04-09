import { getGradeBgColor } from "@/lib/grades"

interface GradeBarProps {
  value: number | null
  max?: number
  className?: string
}

export default function GradeBar({ value, max = 10, className = "" }: GradeBarProps) {
  const pct = value !== null ? Math.min(100, (value / max) * 100) : 0
  const color = getGradeBgColor(value)

  return (
    <div
      className={`w-full h-1.5 rounded-full overflow-hidden ${className}`}
      style={{ background: "var(--bdr)" }}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
