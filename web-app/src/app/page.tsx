import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, TrendingUp, CalendarDays, Plug } from "lucide-react"
import { PublicNavbar } from "@/components/PublicNavbar"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <PublicNavbar />

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-8 text-xs font-medium"
          style={{
            background: "var(--surface)",
            color: "var(--fg-muted)",
            border: "1px solid var(--bdr)",
          }}
        >
          For Mano Dienynas students
        </div>

        <h1
          className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-none mb-6 max-w-3xl"
          style={{ fontFamily: "var(--font-syne), sans-serif", color: "var(--fg)" }}
        >
          Your grades,
          <br />
          <span style={{ color: "var(--accent)" }}>always in sync.</span>
        </h1>

        <p
          className="text-lg max-w-xl mb-10 leading-relaxed"
          style={{ color: "var(--fg-muted)" }}
        >
          A clean, fast dashboard for your courses — with grade graphs, calendar
          integration, and sync to Notion, Google Calendar, and Apple Calendar.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/register"
            className="px-6 py-3 font-semibold rounded-xl text-sm transition-colors"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl text-sm transition-colors"
            style={{ border: "1px solid var(--bdr)", color: "var(--fg-muted)" }}
          >
            Sign in →
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <p
          className="text-xs font-semibold uppercase tracking-widest text-center mb-10"
          style={{ color: "var(--fg-muted)" }}
        >
          What you get
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl p-6"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--bdr)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: "var(--fg)" }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-3xl mx-auto px-6 pb-28">
        <h2
          className="text-2xl font-bold text-center mb-12"
          style={{ fontFamily: "var(--font-syne), sans-serif", color: "var(--fg)" }}
        >
          How it works
        </h2>
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
                className="text-3xl font-bold mb-4"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "var(--accent)",
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
      </section>

      {/* ── Footer CTA ── */}
      <section
        className="py-16 text-center px-6"
        style={{ borderTop: "1px solid var(--bdr)" }}
      >
        <h2
          className="text-3xl font-bold mb-4"
          style={{ fontFamily: "var(--font-syne), sans-serif", color: "var(--fg)" }}
        >
          Ready to get started?
        </h2>
        <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "var(--fg-muted)" }}>
          Setup takes two minutes. You&apos;ll need your Mano Dienynas credentials.
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-3 font-semibold rounded-xl text-sm transition-colors"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Create your free account
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer
        className="px-8 py-6 flex items-center justify-between text-xs"
        style={{ borderTop: "1px solid var(--bdr)", color: "var(--fg-muted)" }}
      >
        <span>© 2026 Dienynas SYNC</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:opacity-80 transition-opacity">
            Sign in
          </Link>
          <Link href="/register" className="hover:opacity-80 transition-opacity">
            Register
          </Link>
        </div>
      </footer>
    </div>
  )
}

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Instant Dashboard",
    body: "GPA, courses, and recent grades at a glance. Everything loads instantly from our database.",
  },
  {
    icon: TrendingUp,
    title: "Grade Trends",
    body: "Visualize your progress over time with interactive charts and per-category breakdowns.",
  },
  {
    icon: CalendarDays,
    title: "Calendar View",
    body: "See all your deadlines and exams in one place. Filter by course, view by week or month.",
  },
  {
    icon: Plug,
    title: "Integrations",
    body: "Push grades and deadlines to Notion, Google Calendar, or export as an .ics file.",
  },
]

const STEPS = [
  {
    step: "01",
    title: "Connect",
    body: "Upload your scraped grades.json or set up automatic scraping with your Mano Dienynas credentials.",
  },
  {
    step: "02",
    title: "Sync",
    body: "Your grades are stored securely in your personal account — isolated and encrypted.",
  },
  {
    step: "03",
    title: "Track",
    body: "Browse your dashboard, explore grade graphs, and sync deadlines to your calendar.",
  },
]
