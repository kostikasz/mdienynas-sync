"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"

type Tab = "signin" | "register"

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg width="20" height="15" viewBox="0 0 71 55" aria-hidden="true" fill="currentColor">
      <path d="M60.1 4.9A58.5 58.5 0 0045.7.4a.2.2 0 00-.2.1 40.7 40.7 0 00-1.8 3.7 54 54 0 00-16.2 0A37.6 37.6 0 0025.6.5a.2.2 0 00-.2-.1A58.3 58.3 0 0010.9 4.9a.2.2 0 00-.1.1C1.6 18.1-.9 31 .3 43.6a.2.2 0 00.1.2 58.8 58.8 0 0017.7 8.9.2.2 0 00.2-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 010-.4l1.1-.8a.2.2 0 01.2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 01.2 0l1.1.8a.2.2 0 010 .4 36.2 36.2 0 01-5.5 2.6.2.2 0 00-.1.3 47.1 47.1 0 003.6 5.9.2.2 0 00.2.1 58.6 58.6 0 0017.7-8.9.2.2 0 00.1-.2c1.5-15.2-2.5-28-10.5-39.6a.2.2 0 00-.1-.1zM23.7 35.8c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2z"/>
    </svg>
  )
}

export function CheckoutAuth() {
  const [tab, setTab] = useState<Tab>("signin")

  const [siEmail,    setSiEmail]    = useState("")
  const [siPassword, setSiPassword] = useState("")
  const [siError,    setSiError]    = useState<string | null>(null)
  const [siLoading,  setSiLoading]  = useState<string | null>(null)
  const [siToken,    setSiToken]    = useState<string | null>(null)
  const siTurnstileRef = useRef<TurnstileInstance>(null)

  const [regEmail,    setRegEmail]    = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regConfirm,  setRegConfirm]  = useState("")
  const [regError,    setRegError]    = useState<string | null>(null)
  const [regLoading,  setRegLoading]  = useState(false)
  const [regToken,    setRegToken]    = useState<string | null>(null)
  const regTurnstileRef = useRef<TurnstileInstance>(null)

  const inputStyle: React.CSSProperties = {
    background: "var(--input-bg)",
    border: "1px solid var(--input-bdr)",
    color: "var(--fg)",
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement>) { e.target.style.borderColor = "var(--input-focus)" }
  function onBlurI(e: React.FocusEvent<HTMLInputElement>) { e.target.style.borderColor = "var(--input-bdr)" }

  async function handleOAuth(provider: "google" | "discord") {
    setSiError(null)
    setSiLoading(provider)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback?next=/checkout/payment` },
    })
    if (error) { setSiError("OAuth sign-in failed. Please try again."); setSiLoading(null) }
  }

  async function verifyCaptcha(token: string | null): Promise<boolean> {
    if (!token) return false
    const res = await fetch("/api/auth/turnstile/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    const { success } = await res.json()
    return !!success
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSiError(null)
    setSiLoading("email")

    if (!await verifyCaptcha(siToken)) {
      setSiError("Please complete the security check.")
      siTurnstileRef.current?.reset()
      setSiToken(null)
      setSiLoading(null)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword })
    if (error) {
      setSiError("Wrong email or password.")
      siTurnstileRef.current?.reset()
      setSiToken(null)
      setSiLoading(null)
      return
    }
    window.location.href = "/checkout/payment"
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError(null)
    if (regPassword !== regConfirm) { setRegError("Passwords do not match."); return }
    if (regPassword.length < 8)     { setRegError("Password must be at least 8 characters."); return }

    if (!await verifyCaptcha(regToken)) {
      setRegError("Please complete the security check.")
      regTurnstileRef.current?.reset()
      setRegToken(null)
      return
    }

    setRegLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: { emailRedirectTo: `${location.origin}/checkout/payment` },
    })
    if (error) { setRegError(error.message); setRegLoading(false); return }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: regEmail, password: regPassword })
    if (signInError) {
      setRegError("Account created! Please check your email to confirm, then sign in.")
      setRegLoading(false)
      return
    }
    window.location.href = "/checkout/payment"
  }

  const isDisabled = siLoading !== null || regLoading
  const tabBase: React.CSSProperties = {
    flex: 1, padding: "8px 0", fontSize: "0.875rem", fontWeight: 600,
    borderRadius: "8px", cursor: "pointer", border: "none", transition: "all 0.15s ease",
  }

  return (
    <div
      className="rounded-2xl p-8"
      style={{ background: "var(--surface)", border: "1px solid var(--bdr)", boxShadow: "var(--shadow)" }}
    >
      <h2 className="text-xl font-bold mb-6" style={{ color: "var(--fg)" }}>
        Sign in to continue
      </h2>

      {/* OAuth */}
      <div className="space-y-3 mb-5">
        <button
          onClick={() => handleOAuth("google")} disabled={isDisabled}
          className="w-full flex items-center justify-center gap-3 font-medium rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
          style={{ background: "var(--surface-2)", border: "1px solid var(--bdr)", color: "var(--fg)" }}
        >
          <GoogleIcon />
          {siLoading === "google" ? "Redirecting…" : "Continue with Google"}
        </button>
        <button
          onClick={() => handleOAuth("discord")} disabled={isDisabled}
          className="w-full flex items-center justify-center gap-3 font-medium rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
          style={{ background: "#5865F2", color: "#fff" }}
        >
          <DiscordIcon />
          {siLoading === "discord" ? "Redirecting…" : "Continue with Discord"}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 border-t" style={{ borderColor: "var(--bdr)" }} />
        <span className="text-xs" style={{ color: "var(--fg-muted)" }}>or</span>
        <div className="flex-1 border-t" style={{ borderColor: "var(--bdr)" }} />
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-5"
        style={{ background: "var(--surface-2)", border: "1px solid var(--bdr)" }}
      >
        {(["signin", "register"] as Tab[]).map((t) => (
          <button
            key={t} type="button" onClick={() => setTab(t)}
            style={{
              ...tabBase,
              ...(tab === t
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : { background: "transparent", color: "var(--fg-muted)" }),
            }}
          >
            {t === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {tab === "signin" && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--fg-muted)" }}>Email</label>
            <input type="email" value={siEmail} onChange={(e) => setSiEmail(e.target.value)}
              required disabled={isDisabled} placeholder="you@example.com" autoComplete="email"
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none disabled:opacity-70"
              style={inputStyle} onFocus={onFocus} onBlur={onBlurI} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--fg-muted)" }}>Password</label>
            <input type="password" value={siPassword} onChange={(e) => setSiPassword(e.target.value)}
              required disabled={isDisabled} placeholder="••••••••" autoComplete="current-password"
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none disabled:opacity-70"
              style={inputStyle} onFocus={onFocus} onBlur={onBlurI} />
          </div>
          <Turnstile ref={siTurnstileRef} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            options={{ theme: "auto" }} onSuccess={setSiToken}
            onError={() => setSiToken(null)} onExpire={() => setSiToken(null)} />
          {siError && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ color: "#dc2626", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
              {siError}
            </p>
          )}
          <button type="submit" disabled={isDisabled}
            className="w-full font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
            {siLoading === "email" ? "Signing in…" : "Continue to payment"}
          </button>
        </form>
      )}

      {tab === "register" && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--fg-muted)" }}>Email</label>
            <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
              required disabled={isDisabled} placeholder="you@example.com" autoComplete="email"
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none disabled:opacity-70"
              style={inputStyle} onFocus={onFocus} onBlur={onBlurI} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--fg-muted)" }}>Password</label>
            <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
              required minLength={8} disabled={isDisabled} placeholder="Min. 8 characters" autoComplete="new-password"
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none disabled:opacity-70"
              style={inputStyle} onFocus={onFocus} onBlur={onBlurI} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--fg-muted)" }}>Confirm password</label>
            <input type="password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)}
              required disabled={isDisabled} placeholder="••••••••" autoComplete="new-password"
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none disabled:opacity-70"
              style={inputStyle} onFocus={onFocus} onBlur={onBlurI} />
          </div>
          <Turnstile ref={regTurnstileRef} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            options={{ theme: "auto" }} onSuccess={setRegToken}
            onError={() => setRegToken(null)} onExpire={() => setRegToken(null)} />
          {regError && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ color: "#dc2626", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
              {regError}
            </p>
          )}
          <button type="submit" disabled={isDisabled}
            className="w-full font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
            {regLoading ? "Creating account…" : "Create account & pay"}
          </button>
        </form>
      )}
    </div>
  )
}
