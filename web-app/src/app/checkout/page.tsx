import { PublicNavbar } from "@/components/PublicNavbar"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { CheckoutAuth } from "./CheckoutAuth"

const FEATURES = [
  "5 AI grade overviews per day",
  "Grade dashboard, graphs & calendar",
  "Google Calendar & Notion sync",
  "Priority support & early access",
]

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: "var(--accent)", flexShrink: 0, marginTop: "1px" }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default async function CheckoutPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <PublicNavbar />

      <div className="flex-1 px-6 py-12">
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
        >
          {/* ── Left: Order Summary ─────────────────────────────── */}
          <div
            className="rounded-2xl p-8 h-fit"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--bdr)",
              boxShadow: "var(--shadow)",
            }}
          >
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-6"
              style={{ color: "var(--fg-muted)" }}
            >
              Order Summary
            </h2>

            {/* Plan */}
            <div
              className="flex items-start justify-between mb-6 pb-6"
              style={{ borderBottom: "1px solid var(--bdr)" }}
            >
              <div>
                <p className="text-lg font-bold" style={{ color: "var(--fg)" }}>
                  Dienynas SYNC Pro
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--fg-muted)" }}>
                  Monthly subscription
                </p>
              </div>
              <p className="text-lg font-bold" style={{ color: "var(--fg)" }}>
                €3.99
                <span
                  className="text-sm font-normal ml-1"
                  style={{ color: "var(--fg-muted)" }}
                >
                  / mo
                </span>
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-6">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--fg)" }}>
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            {/* Total */}
            <div
              className="flex items-center justify-between pt-5 mb-4"
              style={{ borderTop: "1px solid var(--bdr)" }}
            >
              <p className="font-semibold" style={{ color: "var(--fg)" }}>
                Total today
              </p>
              <p className="text-xl font-bold" style={{ color: "var(--fg)" }}>
                €3.99
              </p>
            </div>

            <p className="text-xs mb-5" style={{ color: "var(--fg-muted)" }}>
              Billed monthly. Cancel anytime.
            </p>

            {/* Secure badge */}
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--bdr)",
                color: "var(--fg-muted)",
              }}
            >
              <LockIcon />
              Secure checkout powered by Paysera
            </div>
          </div>

          {/* ── Right: Auth or Continue ──────────────────────────── */}
          {user ? (
            <div
              className="rounded-2xl p-8 h-fit"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--bdr)",
                boxShadow: "var(--shadow)",
              }}
            >
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: "var(--fg)" }}
              >
                Ready to continue
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
                Signed in as{" "}
                <span className="font-medium" style={{ color: "var(--fg)" }}>
                  {user.email}
                </span>
              </p>

              <Link
                href="/checkout/payment"
                className="flex items-center justify-center gap-2 w-full font-semibold rounded-lg py-3 text-sm transition-colors"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                Continue to payment →
              </Link>
            </div>
          ) : (
            <CheckoutAuth />
          )}
        </div>
      </div>
    </div>
  )
}
