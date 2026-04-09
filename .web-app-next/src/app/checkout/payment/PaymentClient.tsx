"use client"

import { useState } from "react"
import Link from "next/link"

type Provider = "paysera" | "paypal" | "googlepay" | "applepay"

const FEATURES = [
  "5 AI grade overviews per day",
  "Grade dashboard, graphs & calendar",
  "Google Calendar & Notion sync",
  "Priority support & early access",
]

const PAYMENT_METHODS: { id: Provider; label: string; sub: string; available: boolean }[] = [
  { id: "paysera",   label: "Paysera",     sub: "Visa, Mastercard, online banking", available: true  },
  { id: "paypal",    label: "PayPal",       sub: "Pay with your PayPal account",     available: false },
  { id: "googlepay", label: "Google Pay",   sub: "Pay with Google Pay",              available: false },
  { id: "applepay",  label: "Apple Pay",    sub: "Pay with Apple Pay",               available: false },
]

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ color: "var(--accent)", flexShrink: 0, marginTop: "1px" }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

function PayPalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M7.5 21H4.5L6 3h6c3.3 0 5.5 1.5 5 5s-3 5-6 5H8.5L7.5 21z" fill="#003087"/>
      <path d="M10.5 21H7.5L9 7.5h5c2.8 0 4.5 1.2 4 4s-2.5 4-5 4h-2L10.5 21z" fill="#009cde"/>
    </svg>
  )
}

function GooglePayIcon() {
  return (
    <svg width="36" height="14" viewBox="0 0 56 22" aria-hidden="true">
      <text x="0" y="17" fontFamily="Arial" fontWeight="700" fontSize="16" fill="#5f6368">G</text>
      <text x="10" y="17" fontFamily="Arial" fontWeight="400" fontSize="16" fill="#5f6368">Pay</text>
    </svg>
  )
}

function ApplePayIcon() {
  return (
    <svg width="40" height="16" viewBox="0 0 70 28" aria-hidden="true">
      <text x="0" y="21" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif" fontWeight="500" fontSize="18" fill="currentColor"> Pay</text>
    </svg>
  )
}

function ProviderIcon({ id }: { id: Provider }) {
  if (id === "paypal")    return <PayPalIcon />
  if (id === "googlepay") return <GooglePayIcon />
  if (id === "applepay")  return <ApplePayIcon />
  return null
}

export function PaymentClient() {
  const [selected, setSelected] = useState<Provider>("paysera")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handlePay() {
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", provider: selected }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Payment setup failed. Please try again."); setLoading(false); return }
      window.location.href = data.paymentUrl
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="px-6 pt-6">
        <div className="max-w-5xl mx-auto">
          <Link href="/checkout" className="inline-flex items-center gap-1.5 text-sm transition-colors" style={{ color: "var(--fg-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Order Summary
          </Link>
        </div>
      </div>

      <div className="flex-1 px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">

          {/* Order recap */}
          <div className="rounded-2xl p-6 h-fit" style={{ background: "var(--surface)", border: "1px solid var(--bdr)", boxShadow: "var(--shadow)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--fg-muted)" }}>
              Order Summary
            </h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--fg)" }}>Dienynas SYNC Pro</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>Monthly subscription</p>
              </div>
              <p className="font-bold text-sm" style={{ color: "var(--fg)" }}>
                €3.99<span style={{ color: "var(--fg-muted)", fontWeight: 400 }}>/mo</span>
              </p>
            </div>
            <ul className="space-y-2 mb-4">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--fg-muted)" }}>
                  <CheckIcon />{f}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-3 text-sm" style={{ borderTop: "1px solid var(--bdr)" }}>
              <span className="font-medium" style={{ color: "var(--fg)" }}>Total today</span>
              <span className="font-bold" style={{ color: "var(--fg)" }}>€3.99</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="rounded-2xl p-8 h-fit" style={{ background: "var(--surface)", border: "1px solid var(--bdr)", boxShadow: "var(--shadow)" }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: "var(--fg)" }}>
              Choose payment method
            </h2>

            <div className="space-y-3 mb-6">
              {PAYMENT_METHODS.map((m) => {
                const isSelected = selected === m.id
                const isDisabledMethod = !m.available
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isDisabledMethod}
                    onClick={() => m.available && setSelected(m.id)}
                    className="w-full text-left rounded-xl p-4 transition-all"
                    style={{
                      border: isSelected ? "2px solid var(--accent)" : "1px solid var(--bdr)",
                      background: isSelected ? "var(--surface-2)" : "transparent",
                      opacity: isDisabledMethod ? 0.5 : 1,
                      cursor: isDisabledMethod ? "not-allowed" : "pointer",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Radio */}
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ border: `2px solid ${isSelected ? "var(--accent)" : "var(--fg-muted)"}` }}>
                        {isSelected && <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" style={{ color: "var(--fg)" }}>{m.label}</span>
                          {m.id !== "paysera" && <ProviderIcon id={m.id} />}
                          {!m.available && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ background: "var(--surface-2)", color: "var(--fg-muted)", border: "1px solid var(--bdr)" }}>
                              Coming soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>{m.sub}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {error && (
              <p className="text-sm rounded-lg px-3 py-2 mb-4" style={{ color: "#dc2626", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
                {error}
              </p>
            )}

            <button
              onClick={handlePay} disabled={loading || !PAYMENT_METHODS.find(m => m.id === selected)?.available}
              className="w-full font-semibold rounded-lg py-3 text-sm transition-colors disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {loading ? `Redirecting to ${PAYMENT_METHODS.find(m => m.id === selected)?.label}…` : "Pay €3.99 →"}
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs" style={{ color: "var(--fg-muted)" }}>
              <LockIcon />
              Secure payment · SSL encrypted
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
