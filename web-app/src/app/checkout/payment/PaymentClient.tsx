"use client"

import { useState } from "react"
import Link from "next/link"

const FEATURES = [
  "5 AI grade overviews per day",
  "Grade dashboard, graphs & calendar",
  "Google Calendar & Notion sync",
  "Priority support & early access",
]

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
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

function BackArrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

export function PaymentClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Payment setup failed. Please try again.")
        setLoading(false)
        return
      }

      // Redirect to Paysera payment page
      window.location.href = data.paymentUrl
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Back link */}
      <div className="px-6 pt-6">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/checkout"
            className="inline-flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            <BackArrow />
            Order Summary
          </Link>
        </div>
      </div>

      <div className="flex-1 px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* ── Left: Order recap ───────────────────────────────── */}
          <div
            className="rounded-2xl p-6 h-fit"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--bdr)",
              boxShadow: "var(--shadow)",
            }}
          >
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--fg-muted)" }}
            >
              Order Summary
            </h2>

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--fg)" }}>
                  Dienynas SYNC Pro
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
                  Monthly subscription
                </p>
              </div>
              <p className="font-bold text-sm" style={{ color: "var(--fg)" }}>
                €3.99<span style={{ color: "var(--fg-muted)", fontWeight: 400 }}>/mo</span>
              </p>
            </div>

            <ul className="space-y-2 mb-4">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--fg-muted)" }}>
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            <div
              className="flex items-center justify-between pt-3 text-sm"
              style={{ borderTop: "1px solid var(--bdr)" }}
            >
              <span className="font-medium" style={{ color: "var(--fg)" }}>Total today</span>
              <span className="font-bold" style={{ color: "var(--fg)" }}>€3.99</span>
            </div>
          </div>

          {/* ── Right: Payment method ──────────────────────────── */}
          <div
            className="rounded-2xl p-8 h-fit"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--bdr)",
              boxShadow: "var(--shadow)",
            }}
          >
            <h2
              className="text-xl font-bold mb-6"
              style={{ color: "var(--fg)" }}
            >
              Choose payment method
            </h2>

            {/* Paysera option (pre-selected, only option) */}
            <div
              className="rounded-xl p-4 mb-6 cursor-default"
              style={{
                border: "2px solid var(--accent)",
                background: "var(--surface-2)",
              }}
            >
              <div className="flex items-start gap-3">
                {/* Radio indicator */}
                <div
                  className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ border: "2px solid var(--accent)" }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                </div>

                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--fg)" }}>
                    Paysera
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
                    Pay with card or bank transfer
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
                    Visa, Mastercard, online banking
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <p
                className="text-sm rounded-lg px-3 py-2 mb-4"
                style={{
                  color: "#dc2626",
                  background: "rgba(220,38,38,0.08)",
                  border: "1px solid rgba(220,38,38,0.2)",
                }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full font-semibold rounded-lg py-3 text-sm transition-colors disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {loading ? "Redirecting to Paysera…" : "Pay €3.99 →"}
            </button>

            {/* Secure note */}
            <div
              className="flex items-center justify-center gap-1.5 mt-4 text-xs"
              style={{ color: "var(--fg-muted)" }}
            >
              <LockIcon />
              Secure payment via Paysera
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
