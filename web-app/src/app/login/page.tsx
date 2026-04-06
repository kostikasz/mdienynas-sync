"use client"

import { useState, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Suspense } from "react"
import { PublicNavbar } from "@/components/PublicNavbar"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { startAuthentication } from "@simplewebauthn/browser"

function LoginForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [email,          setEmail]          = useState("")
  const [password,       setPassword]       = useState("")
  const [showPassword,   setShowPassword]   = useState(false)
  const [hasPasskey,     setHasPasskey]     = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error,          setError]          = useState<string | null>(
    searchParams.get("error") === "oauth" ? "OAuth sign-in failed. Please try again." : null
  )
  const [loading,        setLoading]        = useState<"email" | "google" | "discord" | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const turnstileRef = useRef<TurnstileInstance>(null)

  function handleEmailBlur() {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes("@")) return
    setShowPassword(true)

    // Check if email has a passkey registered
    fetch(`/api/auth/passkey/check?email=${encodeURIComponent(trimmed)}`)
      .then(res => res.json())
      .then(data => setHasPasskey(data.hasPasskey))
      .catch(() => setHasPasskey(false))
  }

  async function handlePasskeySignIn() {
    setError(null)
    setPasskeyLoading(true)

    try {
      // Get authentication options
      const optionsRes = await fetch("/api/auth/passkey/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!optionsRes.ok) throw new Error("Failed to get options")
      const options = await optionsRes.json()

      // Start WebAuthn ceremony
      const authResponse = await startAuthentication({ optionsJSON: options })

      // Verify with server
      const verifyRes = await fetch("/api/auth/passkey/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authResponse, email: email.trim() }),
      })
      if (!verifyRes.ok) throw new Error("Verification failed")
      const { passkeyToken } = await verifyRes.json()

      // Sign in with NextAuth using the passkeyToken
      const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
      const result = await signIn("credentials", {
        passkeyToken,
        redirect: false,
      })

      if (result?.error) throw new Error("Sign-in failed")

      // Check if MFA is pending — use getSession() (App Router pattern, not Pages Router fetch)
      const { getSession } = await import("next-auth/react")
      const updatedSession = await getSession()

      if (updatedSession?.user?.mfaPending) {
        router.push("/2fa")
      } else {
        router.push(callbackUrl)
      }
    } catch {
      setError("Passkey sign-in failed. Try your password instead.")
    } finally {
      setPasskeyLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!showPassword) {
      handleEmailBlur()
      return
    }
    setError(null)
    setLoading("email")

    if (!turnstileToken) {
      setError("Please complete the security check.")
      setLoading(null)
      return
    }

    const verRes = await fetch("/api/auth/turnstile/verify", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token: turnstileToken }),
    })
    const { success: captchaOk } = await verRes.json()
    if (!captchaOk) {
      setError("Security check failed. Please try again.")
      turnstileRef.current?.reset()
      setTurnstileToken(null)
      setLoading(null)
      return
    }

    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Wrong email or password.")
      turnstileRef.current?.reset()
      setTurnstileToken(null)
      setLoading(null)
      return
    }

    // Check if MFA is pending — use getSession() (App Router pattern)
    const { getSession } = await import("next-auth/react")
    const updatedSession = await getSession()

    if (updatedSession?.user?.mfaPending) {
      router.push("/2fa")
    } else {
      router.push(callbackUrl)
    }
  }

  async function handleOAuth(provider: "google" | "discord") {
    setError(null)
    setLoading(provider)

    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
    await signIn("keycloak", { callbackUrl }, { kc_idp_hint: provider })
  }

  const isDisabled = loading !== null || passkeyLoading

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
                Welcome back
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
                Sign in to your account
              </p>
            </div>

            {/* OAuth buttons */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleOAuth("google")}
                disabled={isDisabled}
                className="w-full flex items-center justify-center gap-3 font-medium rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--bdr)",
                  color: "var(--fg)",
                }}
              >
                <GoogleIcon />
                {loading === "google" ? "Redirecting…" : "Continue with Google"}
              </button>

              <button
                onClick={() => handleOAuth("discord")}
                disabled={isDisabled}
                className="w-full flex items-center justify-center gap-3 font-medium rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
                style={{ background: "#5865F2", color: "#fff" }}
              >
                <DiscordIcon />
                {loading === "discord" ? "Redirecting…" : "Continue with Discord"}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 border-t" style={{ borderColor: "var(--bdr)" }} />
              <span className="text-xs" style={{ color: "var(--fg-muted)" }}>or</span>
              <div className="flex-1 border-t" style={{ borderColor: "var(--bdr)" }} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setShowPassword(false)
                    setHasPasskey(false)
                  }}
                  onBlur={handleEmailBlur}
                  required
                  disabled={isDisabled}
                  className="w-full rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-70 outline-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-bdr)",
                    color: "var(--fg)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--input-focus)")}
                  onBlurCapture={(e) => (e.target.style.borderColor = "var(--input-bdr)")}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              {/* Password + passkey button (shown after email blur) */}
              {showPassword && (
                <>
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                      disabled={isDisabled}
                      className="w-full rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-70 outline-none"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--input-bdr)",
                        color: "var(--fg)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--input-focus)")}
                      onBlurCapture={(e) => (e.target.style.borderColor = "var(--input-bdr)")}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>

                  {/* Passkey button — shown below password when email has a passkey */}
                  {hasPasskey && (
                    <button
                      type="button"
                      onClick={handlePasskeySignIn}
                      disabled={isDisabled || passkeyLoading}
                      className="w-full flex items-center justify-center gap-2 font-medium rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--bdr)",
                        color: "var(--accent)",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
                        <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
                      </svg>
                      {passkeyLoading ? "Verifying…" : "Sign in with passkey"}
                    </button>
                  )}

                  <Turnstile
                    ref={turnstileRef}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                    options={{ theme: "auto" }}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onError={() => setTurnstileToken(null)}
                    onExpire={() => setTurnstileToken(null)}
                  />
                </>
              )}

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

              {showPassword && (
                <button
                  type="submit"
                  disabled={isDisabled}
                  className="w-full font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  {loading === "email" ? "Signing in…" : "Sign in"}
                </button>
              )}

              {!showPassword && email.includes("@") && (
                <button
                  type="button"
                  onClick={handleEmailBlur}
                  disabled={isDisabled}
                  className="w-full font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  Continue
                </button>
              )}
            </form>
          </div>

          <p className="text-center text-sm mt-5" style={{ color: "var(--fg-muted)" }}>
            No account?{" "}
            <Link
              href="/register"
              className="font-medium transition-colors"
              style={{ color: "var(--accent)" }}
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
