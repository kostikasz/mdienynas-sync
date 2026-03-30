"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { startAuthentication } from "@simplewebauthn/browser"
import type { Factor } from "@supabase/supabase-js"

const MAX_ATTEMPTS = 10
const EXPIRY_MS    = 10 * 60 * 1000  // 10 minutes

type Tab = "totp" | "passkey"

export default function MfaPage() {
  const router = useRouter()
  const [factors,    setFactors]    = useState<Factor[]>([])
  const [loading,    setLoading]    = useState(true)
  const [has2faKey,  setHas2faKey]  = useState(false)
  const [activeTab,  setActiveTab]  = useState<Tab>("totp")
  const [userEmail,  setUserEmail]  = useState<string | null>(null)
  const [attempts,   setAttempts]   = useState(0)

  // TOTP state
  const [totpCode,   setTotpCode]   = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const signOutAndRedirect = useCallback(async (to: string) => {
    sessionStorage.removeItem("mfa_attempts")
    sessionStorage.removeItem("mfa_started_at")
    await createClient().auth.signOut()
    router.replace(to)
  }, [router])

  // ── Expiry timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionStorage.getItem("mfa_started_at")) {
      sessionStorage.setItem("mfa_started_at", Date.now().toString())
    }

    function checkExpiry() {
      const s = sessionStorage.getItem("mfa_started_at")
      if (!s) return
      if (Date.now() - parseInt(s, 10) > EXPIRY_MS) {
        signOutAndRedirect("/")
      }
    }

    checkExpiry()
    const interval = setInterval(checkExpiry, 30_000)
    return () => clearInterval(interval)
  }, [signOutAndRedirect])

  // ── Init: load factors, check AAL, restore attempt count ─────────────────────
  useEffect(() => {
    const savedAttempts = parseInt(sessionStorage.getItem("mfa_attempts") ?? "0", 10)
    if (savedAttempts >= MAX_ATTEMPTS) {
      signOutAndRedirect("/")
      return
    }
    setAttempts(savedAttempts)

    async function init() {
      const supabase = createClient()
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (!aal?.currentLevel) { router.replace("/login"); return }
      if (aal.currentLevel === "aal2") { router.replace("/dashboard"); return }

      const { data: factorData } = await supabase.auth.mfa.listFactors()
      const verified = (factorData?.all ?? []).filter(
        (f) => f.status === "verified" && f.factor_type === "totp"
      )
      if (verified.length === 0) { router.replace("/dashboard"); return }

      setFactors(verified)

      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        const res = await fetch(`/api/auth/passkey/check?email=${encodeURIComponent(user.email)}`)
        if (res.ok) {
          const data = await res.json()
          setHas2faKey(!!data.has2faPasskey)
          if (!verified.length && data.has2faPasskey) setActiveTab("passkey")
        }
      }

      setLoading(false)
    }
    init()
  }, [router, signOutAndRedirect])

  // Returns true if the session is now exhausted (should redirect)
  function recordFailure(): { exhausted: boolean; remaining: number } {
    const next = attempts + 1
    setAttempts(next)
    sessionStorage.setItem("mfa_attempts", String(next))
    return { exhausted: next >= MAX_ATTEMPTS, remaining: MAX_ATTEMPTS - next }
  }

  function clearSession() {
    sessionStorage.removeItem("mfa_attempts")
    sessionStorage.removeItem("mfa_started_at")
  }

  // ── TOTP submit ───────────────────────────────────────────────────────────────
  async function handleTOTP(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const factor   = factors[0]
    if (!factor) return

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (cErr || !challenge) {
      setError(cErr?.message ?? "Failed to start challenge")
      setSubmitting(false)
      return
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId:    factor.id,
      challengeId: challenge.id,
      code:        totpCode.replace(/\s/g, ""),
    })

    if (vErr) {
      const { exhausted, remaining } = recordFailure()
      if (exhausted) { await signOutAndRedirect("/"); return }
      setError(`Invalid code — please try again. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`)
      setSubmitting(false)
      return
    }

    clearSession()
    router.push("/dashboard")
    router.refresh()
  }

  // ── Passkey 2FA ───────────────────────────────────────────────────────────────
  async function handlePasskey2FA() {
    if (!userEmail) return
    setError(null)
    setSubmitting(true)

    try {
      const optRes = await fetch("/api/auth/passkey/authenticate/options?mode=2fa", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: userEmail }),
      })
      if (!optRes.ok) {
        setError("Could not start security key verification.")
        setSubmitting(false)
        return
      }

      const options = await optRes.json()

      let authResponse
      try {
        authResponse = await startAuthentication({ optionsJSON: options })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("abort")) {
          setSubmitting(false)
          return
        }
        const { exhausted, remaining } = recordFailure()
        if (exhausted) { await signOutAndRedirect("/"); return }
        setError(`Security key verification failed. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`)
        setSubmitting(false)
        return
      }

      const verRes = await fetch("/api/auth/passkey/authenticate/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ response: authResponse }),
      })

      const verData = await verRes.json()
      if (!verRes.ok || !verData.verified) {
        const { exhausted, remaining } = recordFailure()
        if (exhausted) { await signOutAndRedirect("/"); return }
        setError(`Security key verification failed. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`)
        setSubmitting(false)
        return
      }

      const { error: otpError } = await createClient().auth.verifyOtp({
        token_hash: verData.hashed_token,
        type:       "magiclink",
      })
      if (otpError) {
        setError("Failed to create session. Please try again.")
        setSubmitting(false)
        return
      }

      clearSession()
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fefae0]">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    )
  }

  const showTabs  = factors.length > 0 && has2faKey
  const remaining = MAX_ATTEMPTS - attempts

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fefae0] px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#bc6c25]/15 rounded-full mb-4">
            <ShieldIcon />
          </div>
          <h1 className="text-2xl font-bold text-white">Two-Factor Auth</h1>
          <p className="text-gray-400 text-sm mt-1">Verify your identity to continue</p>

          {/* Show which account is being signed into */}
          {userEmail && (
            <p className="text-xs text-[#dda15e] mt-3 font-mono bg-[#dda15e]/15 border border-[#dda15e]/30 rounded-lg px-3 py-1.5 inline-block">
              {userEmail}
            </p>
          )}
        </div>

        {/* Low-attempt warning */}
        {remaining <= 3 && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-3 py-2 text-center mb-4">
            {remaining} attempt{remaining === 1 ? "" : "s"} remaining — too many failures will sign you out
          </div>
        )}

        {/* Tabs */}
        {showTabs && (
          <div className="flex gap-1 bg-white border border-[#e8dfc0] rounded-lg p-1 mb-6">
            <button
              onClick={() => { setActiveTab("totp"); setError(null) }}
              className={`flex-1 text-sm font-medium rounded-md py-1.5 transition-colors ${
                activeTab === "totp" ? "bg-[#bc6c25] text-white" : "text-[#7a7060] hover:text-[#1c1c17]"
              }`}
            >
              Authenticator app
            </button>
            <button
              onClick={() => { setActiveTab("passkey"); setError(null) }}
              className={`flex-1 text-sm font-medium rounded-md py-1.5 transition-colors ${
                activeTab === "passkey" ? "bg-[#bc6c25] text-white" : "text-[#7a7060] hover:text-[#1c1c17]"
              }`}
            >
              Security key
            </button>
          </div>
        )}

        {/* TOTP form */}
        {(activeTab === "totp" || !showTabs) && factors.length > 0 && (
          <form onSubmit={handleTOTP} className="space-y-4">
            <p className="text-sm text-gray-400 text-center mb-2">
              Enter the 6-digit code from your authenticator app
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9 ]*"
              maxLength={7}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              required
              autoFocus
              autoComplete="one-time-code"
              className="w-full bg-white border border-[#e8dfc0] rounded-lg px-4 py-3 text-[#1c1c17] text-xl tracking-[0.4em] text-center placeholder-[#c0b090] focus:outline-none focus:border-[#bc6c25] transition-colors font-mono"
              placeholder="000000"
            />

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || totpCode.replace(/\s/g, "").length < 6}
              className="w-full bg-[#bc6c25] hover:bg-[#9e5a1f] disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {submitting ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}

        {/* Security key 2FA */}
        {activeTab === "passkey" && has2faKey && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 text-center mb-2">
              Use your security key or passkey to verify
            </p>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}

            <button
              onClick={handlePasskey2FA}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-white/5 disabled:opacity-50 border border-indigo-500/40 text-[#dda15e] font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              <KeyIcon />
              {submitting ? "Waiting for key…" : "Use security key"}
            </button>
          </div>
        )}

        {/* Back button — signs out and returns to login */}
        <button
          onClick={() => signOutAndRedirect("/login")}
          disabled={submitting}
          className="w-full mt-5 text-sm text-[#7a7060] hover:text-[#1c1c17] disabled:opacity-50 transition-colors py-2"
        >
          ← Back to login
        </button>

      </div>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="M21 2l-9.6 9.6"/>
      <path d="M15.5 7.5l3 3L22 7l-3-3"/>
    </svg>
  )
}
