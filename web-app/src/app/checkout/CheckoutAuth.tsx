"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Tab = "signin" | "register"

export function CheckoutAuth() {
  const [tab, setTab] = useState<Tab>("signin")

  // Sign-in state
  const [siEmail,    setSiEmail]    = useState("")
  const [siPassword, setSiPassword] = useState("")
  const [siError,    setSiError]    = useState<string | null>(null)
  const [siLoading,  setSiLoading]  = useState(false)

  // Register state
  const [regEmail,    setRegEmail]    = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regConfirm,  setRegConfirm]  = useState("")
  const [regError,    setRegError]    = useState<string | null>(null)
  const [regLoading,  setRegLoading]  = useState(false)

  const inputStyle = {
    background: "var(--input-bg)",
    border: "1px solid var(--input-bdr)",
    color: "var(--fg)",
  } as React.CSSProperties

  function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--input-focus)"
  }
  function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--input-bdr)"
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSiError(null)
    setSiLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: siEmail,
      password: siPassword,
    })

    if (error) {
      setSiError("Wrong email or password.")
      setSiLoading(false)
      return
    }

    window.location.href = "/checkout/payment"
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError(null)

    if (regPassword !== regConfirm) {
      setRegError("Passwords do not match.")
      return
    }
    if (regPassword.length < 8) {
      setRegError("Password must be at least 8 characters.")
      return
    }

    setRegLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: { emailRedirectTo: `${location.origin}/checkout/payment` },
    })

    if (error) {
      setRegError(error.message)
      setRegLoading(false)
      return
    }

    // After sign-up, attempt immediate sign-in so the user can proceed
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: regEmail,
      password: regPassword,
    })

    if (signInError) {
      // Email confirmation may be required — show a helpful message
      setRegError("Account created! Please check your email to confirm, then sign in.")
      setRegLoading(false)
      return
    }

    window.location.href = "/checkout/payment"
  }

  const tabBase: React.CSSProperties = {
    flex: 1,
    padding: "8px 0",
    fontSize: "0.875rem",
    fontWeight: 600,
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s ease",
  }

  const activeTab: React.CSSProperties = {
    ...tabBase,
    background: "var(--accent)",
    color: "var(--accent-fg)",
  }

  const inactiveTab: React.CSSProperties = {
    ...tabBase,
    background: "transparent",
    color: "var(--fg-muted)",
  }

  return (
    <div
      className="rounded-2xl p-8"
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
        Sign in to continue
      </h2>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6"
        style={{ background: "var(--surface-2)", border: "1px solid var(--bdr)" }}
      >
        <button
          type="button"
          onClick={() => setTab("signin")}
          style={tab === "signin" ? activeTab : inactiveTab}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          style={tab === "register" ? activeTab : inactiveTab}
        >
          Create account
        </button>
      </div>

      {tab === "signin" && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--fg-muted)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={siEmail}
              onChange={(e) => setSiEmail(e.target.value)}
              required
              disabled={siLoading}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none disabled:opacity-70"
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--fg-muted)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={siPassword}
              onChange={(e) => setSiPassword(e.target.value)}
              required
              disabled={siLoading}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none disabled:opacity-70"
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {siError && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{
                color: "#dc2626",
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.2)",
              }}
            >
              {siError}
            </p>
          )}

          <button
            type="submit"
            disabled={siLoading}
            className="w-full font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {siLoading ? "Signing in…" : "Continue to payment"}
          </button>
        </form>
      )}

      {tab === "register" && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--fg-muted)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
              disabled={regLoading}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none disabled:opacity-70"
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--fg-muted)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
              minLength={8}
              disabled={regLoading}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none disabled:opacity-70"
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--fg-muted)" }}
            >
              Confirm password
            </label>
            <input
              type="password"
              value={regConfirm}
              onChange={(e) => setRegConfirm(e.target.value)}
              required
              disabled={regLoading}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none disabled:opacity-70"
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          {regError && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{
                color: "#dc2626",
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.2)",
              }}
            >
              {regError}
            </p>
          )}

          <button
            type="submit"
            disabled={regLoading}
            className="w-full font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {regLoading ? "Creating account…" : "Create account & pay"}
          </button>
        </form>
      )}
    </div>
  )
}
