"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Upload } from "lucide-react"
import type { HomeworkData, HomeworkEntry } from "@/types/homework"

const SUBJECT_COLORS = [
  "#FF2D55", "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA",
  "#007AFF", "#5856D6", "#FF3B30", "#34AADC", "#8E8E93",
]

/** Deterministic color for a subject based on its name — consistent across all views. */
function subjectColor(subject: string): string {
  let hash = 0
  for (let i = 0; i < subject.length; i++) {
    hash = ((hash << 5) - hash + subject.charCodeAt(i)) | 0
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length]
}

const MONTHS = [
  "Sausis","Vasaris","Kovas","Balandis","Gegužė","Birželis",
  "Liepa","Rugpjūtis","Rugsėjis","Spalis","Lapkritis","Gruodis",
]
// Week starts Monday (Lithuanian standard): Pr An Tr Kt Pn Št Sk
const DAYS = ["Pr","An","Tr","Kt","Pn","Št","Sk"]

interface CalEvent {
  date:  string   // YYYY-MM-DD  (due date)
  entry: HomeworkEntry
  color: string
}

function buildEvents(data: HomeworkData): CalEvent[] {
  return data.homework
    .map((entry) => {
      const raw = entry.due_date ?? entry.assigned_date
      if (!raw) return null
      const date = raw.slice(0, 10)
      return { date, entry, color: subjectColor(entry.subject) }
    })
    .filter(Boolean) as CalEvent[]
}

interface Props {
  homework:    HomeworkData | null
  generatedAt: string | null
}

export default function CalendarClient({ homework, generatedAt }: Props) {
  const today      = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)
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
      const res  = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      })
      if (res.ok) {
        setUploadMsg("Uploaded! Refresh to see your homework.")
      } else {
        const err = await res.json()
        setUploadMsg(`Error: ${err.error}`)
      }
    } catch {
      setUploadMsg("Failed to parse file.")
    }
    setUploading(false)
  }

  if (!homework) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="bg-white border border-[#e8dfc0] rounded-2xl p-10 max-w-md w-full shadow-sm">
          <Upload className="w-10 h-10 text-[#bc6c25] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1c1c17] mb-2">No homework data yet</h2>
          <p className="text-[#7a7060] text-sm mb-6">
            Run <code className="text-[#bc6c25]">scraper.py</code> to generate{" "}
            <code className="text-[#bc6c25]">homework.json</code>, then upload it here.
          </p>
          <label className="cursor-pointer inline-flex items-center gap-2 bg-[#bc6c25] hover:bg-[#9e5a1f] text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors">
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading…" : "Upload homework.json"}
            <input type="file" accept=".json" className="hidden" onChange={handleUpload} />
          </label>
          {uploadMsg && <p className="mt-4 text-sm text-[#7a7060]">{uploadMsg}</p>}
        </div>
      </div>
    )
  }

  const events  = buildEvents(homework)
  const byDate  = new Map<string, CalEvent[]>()
  for (const ev of events) {
    const list = byDate.get(ev.date) ?? []
    list.push(ev)
    byDate.set(ev.date, list)
  }

  // Calendar grid — week starts Monday: (Sun=0 → 6, Mon=1 → 0, …)
  const firstDay    = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => {
    if (i < firstDay) return null
    const day = i - firstDay + 1
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return { day, key }
  })

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const selectedEvents = selected ? (byDate.get(selected) ?? []) : []
  const todayKey = today.toISOString().slice(0, 10)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c17]">Homework Calendar</h1>
          {generatedAt && (
            <p className="text-xs text-[#9a9080] mt-0.5">
              Data from {new Date(generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 bg-white hover:bg-[#fef8e8] border border-[#e8dfc0] text-[#7a7060] text-sm font-medium rounded-lg px-4 py-2 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Uploading…" : "Sync homework.json"}
            <input type="file" accept=".json" className="hidden" onChange={handleUpload} />
          </label>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[#e8dfc0] text-[#7a7060] hover:text-[#1c1c17] transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-[#1c1c17] w-36 text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#e8dfc0] text-[#7a7060] hover:text-[#1c1c17] transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {uploadMsg && (
        <div className="bg-[#dda15e]/15 border border-[#dda15e]/30 text-[#7a4c10] text-sm rounded-lg px-4 py-3">
          {uploadMsg}
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white border border-[#e8dfc0] rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-[#e8dfc0]">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-[#9a9080]">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} className="h-24 border-b border-r border-[#e8dfc0]" />

            const { day, key } = cell
            const evs    = byDate.get(key) ?? []
            const isToday = key === todayKey
            const isSel   = key === selected

            return (
              <div
                key={key}
                onClick={() => setSelected(isSel ? null : key)}
                className={`h-24 border-b border-r border-[#e8dfc0] p-1.5 cursor-pointer transition-colors ${
                  isSel ? "bg-[#dda15e]/10" : "hover:bg-[#fef8e8]"
                }`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-1 ${
                  isToday ? "bg-[#bc6c25] text-white font-bold" : "text-[#7a7060]"
                }`}>
                  {day}
                </span>
                <div className="space-y-0.5 overflow-hidden">
                  {evs.slice(0, 3).map((ev, j) => (
                    <div
                      key={j}
                      className="truncate text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: ev.color + "22", color: ev.color }}
                    >
                      {ev.entry.subject.split(" ")[0]}
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <div className="text-[10px] text-gray-500 px-1">+{evs.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="bg-white border border-[#bc6c25]/30 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#bc6c25] mb-4">
            Due on {selected}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-[#9a9080]">No homework due on this day.</p>
          ) : (
            <ul className="space-y-4">
              {selectedEvents.map((ev, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1c1c17]">{ev.entry.subject}</p>
                    {ev.entry.teacher && (
                      <p className="text-xs text-[#9a9080] mb-1">{ev.entry.teacher}</p>
                    )}
                    {ev.entry.description && (
                      <p className="text-sm text-[#4a4438] leading-relaxed">{ev.entry.description}</p>
                    )}
                    {ev.entry.assigned_date && (
                      <p className="text-xs text-[#b0a890] mt-1">
                        Assigned: {ev.entry.assigned_date.slice(0, 10)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Upcoming homework list */}
      <section>
        <h2 className="text-sm font-semibold text-[#7a7060] uppercase tracking-wider mb-3">All Homework</h2>
        <div className="bg-white border border-[#e8dfc0] rounded-xl overflow-hidden shadow-sm">
          {homework.homework.length === 0 ? (
            <p className="text-[#9a9080] text-sm p-4">No homework entries.</p>
          ) : (
            <ul className="divide-y divide-[#e8dfc0]">
              {[...homework.homework]
                .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
                .map((entry) => {
                  const color = subjectColor(entry.subject)
                  return (
                    <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1c1c17]">{entry.subject}</p>
                        {entry.description && (
                          <p className="text-xs text-[#7a7060] mt-0.5 line-clamp-2">{entry.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-[#9a9080]">Due</p>
                        <p className="text-xs font-medium text-[#1c1c17]">
                          {entry.due_date?.slice(0, 10) ?? "–"}
                        </p>
                      </div>
                    </li>
                  )
                })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
