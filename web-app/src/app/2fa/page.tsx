"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"
import { PublicNavbar } from "@/components/PublicNavbar"

function TwoFactorForm() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [code,       setCode]       = useState("")
  const [error,      setError]      = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null) // timestamp ms
  const [countdown,  setCountdown]  = useState(0) // seconds remaining
  const [remaining,  setRemaining]  = useState(3) // attempts remaining
  const inputRef = useRef<HTMLInputElement>(null)

  // Session check: redirect if no session or MFA already complete
  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (session?.user?.mfaPending === false) {
      router.push("/dashboard")
    }
  }, [session, status, router])

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return
    const update = () => {
      const diff = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
      setCountdown(diff)
      if (diff <= 0) {
        setLockedUntil(null)
        setRemaining(3)
        setError(null)
      }
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lockedUntil && lockedUntil > Date.now()) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await res.json()

      if (res.status === 429) {
        // Locked out
        setLockedUntil(Date.now() + (data.lockedUntilMs || 300000))
        setCode("")
        setError("Too many attempts. Please wait.")
        return
      }

      if (res.status === 401) {
        // Wrong code
        setRemaining(data.remaining ?? 0)
        setCode("")
        setError(`Invalid code. ${data.remaining ?? 0} attempt${data.remaining === 1 ? "" : "s"} remaining.`)
        inputRef.current?.focus()
        return
      }

      if (!res.ok) {
        setError("Verification failed. Please try again.")
        return
      }

      // Success — exchange mfaCompleteToken for clean session
      const result = await signIn("credentials", {
        mfaCompleteToken: data.mfaCompleteToken,
        redirect: false,
      })

      if (result?.error) {
        setError("Session upgrade failed. Please log in again.")
        return
      }

      router.push("/dashboard")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleBackToLogin() {
    const res = await fetch("/api/auth/logout", { method: "POST" })
    if (res.ok) {
      const { logoutUrl } = await res.json()
      window.location.href = logoutUrl
    } else {
      await signOut({ redirect: false })
      router.push("/login")
    }
  }

  // Format countdown as M:SS
  const countdownMinutes = Math.floor(countdown / 60)
  const countdownSeconds = countdown % 60
  const countdownDisplay = `${countdownMinutes}:${String(countdownSeconds).padStart(2, "0")}`

  const isLocked = lockedUntil !== null && lockedUntil > Date.now()

  // While loading session, render nothing to avoid flash
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <PublicNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <PublicNavbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--bdr)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div className="text-center mb-7">
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--fg)" }}
              >
                Two-factor authentication
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* TOTP input */}
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  disabled={isLocked || loading}
                  placeholder="000000"
                  className="w-full rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono transition-colors disabled:opacity-70 outline-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-bdr)",
                    color: "var(--fg)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--input-focus)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--input-bdr)")}
                />
              </div>

              {/* Lockout countdown */}
              {isLocked && countdown > 0 && (
                <p className="text-sm text-center" style={{ color: "var(--fg-muted)" }}>
                  Try again in {countdownDisplay}
                </p>
              )}

              {/* Error message */}
              {error && (
                <p
                  className="text-sm rounded-lg px-3 py-2"
                  style={{
                    color: "#dc2626",
                    background: "rgba(220,38,38,0.08)",
                    border: "1px solid rgba(220,38,38,0.2)",
                  }}
                >
                  {error}
                </p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLocked || loading || code.length !== 6}
                className="w-full font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>
          </div>

          {/* Back to login */}
          <p className="text-center text-sm mt-5">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="transition-colors"
              style={{ color: "var(--fg-muted)" }}
            >
              Back to login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function TwoFactorPage() {
  return (
    <Suspense>
      <TwoFactorForm />
    </Suspense>
  )
}
