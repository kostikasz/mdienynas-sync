import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard, TrendingUp, CalendarDays, Plug,
  ArrowRight, CheckCircle, Zap,
} from "lucide-react"
import { PublicNavbar } from "@/components/PublicNavbar"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <PublicNavbar />

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-16 min-h-[82vh]">
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 10%, rgba(49,87,44,0.10) 0%, transparent 70%)",
          }}
        />

        {/* Badge */}
        <div
          className="relative inline-flex items-center gap-2 rounded-full px-3 py-1 mb-8 text-xs font-medium"
          style={{
            background: "var(--surface)",
            color: "var(--fg-muted)",
            border: "1px solid var(--bdr)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          For Mano Dienynas students
        </div>

        {/* Headline */}
        <h1
          className="relative text-center text-[clamp(2.8rem,8vw,6rem)] font-extrabold tracking-tight leading-[1.02] mb-6 max-w-4xl"
          style={{ fontFamily: "var(--font-syne), sans-serif", color: "var(--fg)" }}
        >
          Think, track, and{" "}
          <span
            className="relative inline-block"
            style={{ color: "var(--accent)" }}
          >
            stay in sync
          </span>
          <br />
          with your grades.
        </h1>

        {/* Subtitle */}
        <p
          className="relative text-center text-lg max-w-lg mb-10 leading-relaxed"
          style={{ color: "var(--fg-muted)" }}
        >
          A clean grade dashboard for Mano Dienynas — with trends, calendar
          integration, and sync to Notion, Google Calendar, and more.
        </p>

        {/* CTAs */}
        <div className="relative flex flex-col sm:flex-row items-center gap-3 mb-16">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-xl text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{ border: "1px solid var(--bdr)", color: "var(--fg-muted)" }}
          >
            Sign in to your account
          </Link>
        </div>

        {/* Hero mock UI — floating cards */}
        <div className="relative w-full max-w-5xl flex items-start justify-center gap-4">
          {/* Left card — course grade overview */}
          <div
            className="hidden md:flex flex-col gap-3 w-52 shrink-0 mt-6 rounded-2xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--bdr)",
              boxShadow: "0 8px 32px rgba(19,42,19,0.12), var(--shadow)",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--fg-muted)" }}>
              Courses
            </p>
            {MOCK_COURSES.map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--fg)" }}>{c.name}</p>
                  <div
                    className="mt-0.5 h-1 rounded-full overflow-hidden"
                    style={{ background: "var(--bdr)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.pct}%`, background: c.color }}
                    />
                  </div>
                </div>
                <span
                  className="text-xs font-bold shrink-0 tabular-nums"
                  style={{ color: c.color }}
                >
                  {c.grade}
                </span>
              </div>
            ))}
          </div>

          {/* Center — main mock dashboard card */}
          <div
            className="flex-1 max-w-xl rounded-2xl overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--bdr)",
              boxShadow: "0 16px 48px rgba(19,42,19,0.14), var(--shadow)",
            }}
          >
            {/* Mock toolbar */}
            <div
              className="flex items-center gap-1.5 px-4 py-3"
              style={{ borderBottom: "1px solid var(--bdr)", background: "var(--surface-2)" }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
              <span
                className="ml-3 text-xs font-medium"
                style={{ color: "var(--fg-muted)" }}
              >
                dashboard
              </span>
            </div>
            {/* Mock content */}
            <div className="p-5 space-y-4">
              {/* Stat row */}
              <div className="grid grid-cols-3 gap-3">
                {MOCK_STATS.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--bdr)" }}
                  >
                    <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--fg-muted)" }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Mini bar chart */}
              <div
                className="rounded-xl p-3"
                style={{ background: "var(--surface-2)", border: "1px solid var(--bdr)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--fg-muted)" }}>
                  Grade trend
                </p>
                <div className="flex items-end gap-1.5 h-10">
                  {MOCK_BARS.map((b, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{ height: `${b}%`, background: "var(--accent)", opacity: 0.3 + (b / 100) * 0.7 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right card — upcoming */}
          <div
            className="hidden lg:flex flex-col gap-3 w-48 shrink-0 mt-10 rounded-2xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--bdr)",
              boxShadow: "0 8px 32px rgba(19,42,19,0.12), var(--shadow)",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--fg-muted)" }}>
              Upcoming
            </p>
            {MOCK_UPCOMING.map((u, i) => (
              <div key={i} className="flex items-start gap-2">
                <div
                  className="w-1 h-8 rounded-full shrink-0 mt-0.5"
                  style={{ background: u.color }}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: "var(--fg)" }}>
                    {u.title}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--fg-muted)" }}>{u.date}</p>
                </div>
              </div>
            ))}
            {/* Integration logos hint */}
            <div
              className="mt-1 rounded-lg px-2 py-1.5 flex items-center gap-1.5"
              style={{ background: "var(--surface-2)", border: "1px solid var(--bdr)" }}
            >
              <Zap className="w-3 h-3" style={{ color: "var(--accent)" }} />
              <span className="text-[10px] font-medium" style={{ color: "var(--fg-muted)" }}>
                Synced to Notion
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6" style={{ borderTop: "1px solid var(--bdr)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--accent)" }}
            >
              Features
            </p>
            <h2
              className="text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-syne), sans-serif", color: "var(--fg)" }}
            >
              Everything you need to stay on top
            </h2>
            <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: "var(--fg-muted)" }}>
              Built specifically for Mano Dienynas. No bloat, no setup friction — just your grades, organised.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl p-5 flex flex-col gap-3 group transition-all hover:-translate-y-0.5"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--bdr)",
                  boxShadow: "var(--shadow)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--fg)" }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works / Pricing ──────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6" style={{ borderTop: "1px solid var(--bdr)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--accent)" }}
            >
              Pricing
            </p>
            <h2
              className="text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-syne), sans-serif", color: "var(--fg)" }}
            >
              Free, forever.
            </h2>
            <p className="mt-4 text-base max-w-md mx-auto" style={{ color: "var(--fg-muted)" }}>
              Dienynas SYNC is open-source and completely free. No subscription, no credit card.
            </p>
          </div>

          {/* Single pricing card */}
          <div className="max-w-sm mx-auto">
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: "var(--surface)",
                border: "2px solid var(--accent)",
                boxShadow: "var(--shadow)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
                Free plan
              </p>
              <p
                className="text-5xl font-extrabold mb-1"
                style={{ fontFamily: "var(--font-syne), sans-serif", color: "var(--fg)" }}
              >
                €0
              </p>
              <p className="text-sm mb-8" style={{ color: "var(--fg-muted)" }}>Forever</p>
              <ul className="space-y-3 mb-8 text-left">
                {PRICING_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--fg)" }}>
                    <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-all hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ borderTop: "1px solid var(--bdr)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-syne), sans-serif", color: "var(--fg)" }}
            >
              Up and running in minutes
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map(({ step, title, body }) => (
              <div
                key={step}
                className="rounded-2xl p-6"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--bdr)",
                  boxShadow: "var(--shadow)",
                }}
              >
                <p
                  className="text-3xl font-bold mb-4 tabular-nums"
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    color: "var(--accent)",
                    opacity: 0.7,
                  }}
                >
                  {step}
                </p>
                <h3 className="font-semibold mb-2" style={{ color: "var(--fg)" }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ───────────────────────────────────────────────────── */}
      <section id="about" className="py-24 px-6" style={{ borderTop: "1px solid var(--bdr)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}
          >
            About
          </p>
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6"
            style={{ fontFamily: "var(--font-syne), sans-serif", color: "var(--fg)" }}
          >
            Built by a student,<br />for students.
          </h2>
          <p className="text-base leading-relaxed mb-6" style={{ color: "var(--fg-muted)" }}>
            Mano Dienynas has no public API and no useful dashboard. Dienynas SYNC fills that gap —
            scraping your grades and homework, then presenting them in a fast, modern interface
            with integrations you actually want.
          </p>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            Open-source. Self-hostable. Your data stays yours.
          </p>
        </div>
      </section>

      {/* ─── Footer CTA ──────────────────────────────────────────────── */}
      <section
        className="py-20 px-6 text-center"
        style={{
          borderTop: "1px solid var(--bdr)",
          background: "var(--surface)",
        }}
      >
        <h2
          className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4"
          style={{ fontFamily: "var(--font-syne), sans-serif", color: "var(--fg)" }}
        >
          Ready to get started?
        </h2>
        <p className="text-base mb-8 max-w-sm mx-auto" style={{ color: "var(--fg-muted)" }}>
          Takes two minutes. Just your Mano Dienynas credentials.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-8 py-3.5 font-semibold rounded-xl text-sm transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Create your free account
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer
        className="px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
        style={{ borderTop: "1px solid var(--bdr)", color: "var(--fg-muted)" }}
      >
        <span>© 2026 Dienynas SYNC</span>
        <div className="flex items-center gap-5">
          <a href="#features" className="hover:opacity-80 transition-opacity">Features</a>
          <a href="#pricing"  className="hover:opacity-80 transition-opacity">Pricing</a>
          <a href="#about"    className="hover:opacity-80 transition-opacity">About</a>
          <Link href="/login"    className="hover:opacity-80 transition-opacity">Sign in</Link>
          <Link href="/register" className="hover:opacity-80 transition-opacity">Register</Link>
        </div>
      </footer>
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const MOCK_COURSES = [
  { name: "Mathematics",  grade: "9.2", pct: 92, color: "#4f772d" },
  { name: "Lithuanian",   grade: "8.6", pct: 86, color: "#31572c" },
  { name: "English",      grade: "9.8", pct: 98, color: "#90a955" },
  { name: "Physics",      grade: "7.4", pct: 74, color: "#132a13" },
]

const MOCK_STATS = [
  { label: "GPA",     value: "8.9",  color: "#4f772d" },
  { label: "Courses", value: "7",    color: "var(--fg)" },
  { label: "This wk", value: "+2",   color: "#4f772d" },
]

const MOCK_BARS = [60, 75, 70, 82, 78, 88, 74, 91, 87, 95]

const MOCK_UPCOMING = [
  { title: "Math test",       date: "Tomorrow",   color: "#FF2D55" },
  { title: "Essay deadline",  date: "Thu, Apr 3", color: "#FF9500" },
  { title: "Physics lab",     date: "Fri, Apr 4", color: "#5AC8FA" },
]

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Instant Dashboard",
    body: "GPA, courses, and recent grades at a glance. Everything loads instantly.",
  },
  {
    icon: TrendingUp,
    title: "Grade Trends",
    body: "Interactive charts and per-category breakdowns to visualise your progress.",
  },
  {
    icon: CalendarDays,
    title: "Homework Calendar",
    body: "All deadlines and due dates in one place. Week, month, and list views.",
  },
  {
    icon: Plug,
    title: "Integrations",
    body: "Push grades to Notion, sync deadlines to Google Calendar, or export .ics.",
  },
]

const PRICING_FEATURES = [
  "Unlimited grade snapshots",
  "Dashboard, graphs & calendar",
  "Google Calendar & Notion sync",
  "Apple Calendar .ics export",
  "Secure, encrypted storage",
  "Open source & self-hostable",
]

const STEPS = [
  {
    step: "01",
    title: "Connect",
    body: "Upload your grades.json exported by the scraper, or set up automatic daily syncing.",
  },
  {
    step: "02",
    title: "Explore",
    body: "Browse your dashboard, spot grade trends with charts, and view homework on a calendar.",
  },
  {
    step: "03",
    title: "Integrate",
    body: "Sync your deadlines to Google Calendar, push grades to Notion, or export as .ics.",
  },
]
