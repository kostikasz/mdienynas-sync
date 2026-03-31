"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { startRegistration } from "@simplewebauthn/browser"
import type { Factor, UserIdentity } from "@supabase/supabase-js"
import { ShieldCheck, Lock, Fingerprint, KeyRound } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "overview" | "mfa" | "passwordless" | "password"

type TotpEnrollState = {
  factorId:  string
  svgCode:   string
  secret:    string
  expiresAt: number
}

type Passkey = {
  id:            string
  credential_id: string
  friendly_name: string | null
  device_type:   string | null
  backed_up:     boolean
  created_at:    string
  use_as_2fa:    boolean
}

const STORAGE_KEY   = "totp_enrollment"
const ENROLL_TTL_MS = 5 * 60 * 1000

function decodeSvgDataUri(uri: string): string {
  if (!uri.startsWith("data:")) return uri
  const commaIdx = uri.indexOf(",")
  if (commaIdx === -1) return uri
  const header  = uri.slice(0, commaIdx)
  const payload = uri.slice(commaIdx + 1)
  if (header.includes("base64")) return atob(payload)
  return decodeURIComponent(payload)
}

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "overview",     label: "Overview",                   icon: ShieldCheck },
  { id: "mfa",          label: "Multi-factor authentication", icon: Lock },
  { id: "passwordless", label: "Passwordless login",          icon: Fingerprint },
  { id: "password",     label: "Change password",             icon: KeyRound },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function SecurityClient() {
  const [activeSection, setActiveSection] = useState<Section>("overview")

  const [factors,        setFactors]        = useState<Factor[]>([])
  const [passkeys,       setPasskeys]       = useState<Passkey[]>([])
  const [identities,     setIdentities]     = useState<UserIdentity[]>([])
  const [loadingList,    setLoadingList]    = useState(true)

  // TOTP enrollment
  const [totpEnroll,     setTotpEnroll]     = useState<TotpEnrollState | null>(null)
  const [totpCode,       setTotpCode]       = useState("")
  const [totpLoading,    setTotpLoading]    = useState(false)
  const [totpError,      setTotpError]      = useState<string | null>(null)

  // Passkey enrollment
  const [keyNameMfa,     setKeyNameMfa]     = useState("")
  const [keyNamePwdless, setKeyNamePwdless] = useState("")
  const [keyLoading,     setKeyLoading]     = useState(false)
  const [keyError,       setKeyError]       = useState<string | null>(null)
  const [removingKey,    setRemovingKey]    = useState<string | null>(null)

  // Remove factor
  const [removingId,     setRemovingId]     = useState<string | null>(null)

  // OAuth provider linking
  const [linkingProvider,   setLinkingProvider]   = useState<string | null>(null)
  const [unlinkingIdentity, setUnlinkingIdentity] = useState<string | null>(null)

  // Success banner
  const [successMsg,     setSuccessMsg]     = useState<string | null>(null)

  const [userEmail,      setUserEmail]      = useState<string | null>(null)

  // Change password
  const [cpCurrent,      setCpCurrent]      = useState("")
  const [cpNew,          setCpNew]          = useState("")
  const [cpTotp,         setCpTotp]         = useState("")
  const [cpLoading,      setCpLoading]      = useState(false)
  const [cpError,        setCpError]        = useState<string | null>(null)

  // ── Load data ──────────────────────────────────────────────────────────────

  async function loadFactors() {
    const supabase = createClient()
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.all ?? [])
  }

  async function loadPasskeys() {
    const res = await fetch("/api/auth/passkey/list")
    if (res.ok) {
      const data = await res.json()
      setPasskeys(data.passkeys ?? [])
    }
    setLoadingList(false)
  }

  async function loadIdentities() {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    setIdentities(data.user?.identities ?? [])
    if (data.user?.email) setUserEmail(data.user.email)
  }

  useEffect(() => {
    loadFactors()
    loadPasskeys()
    loadIdentities()

    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const saved = JSON.parse(raw) as TotpEnrollState
        if (Date.now() < saved.expiresAt) {
          setTotpEnroll(saved)
          return
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem(STORAGE_KEY)
      try {
        const stale = JSON.parse(raw) as TotpEnrollState
        if (stale.factorId) {
          createClient().auth.mfa.unenroll({ factorId: stale.factorId }).catch(() => {})
        }
      } catch { /* ignore */ }
    }

    const supabase = createClient()
    supabase.auth.mfa.listFactors().then(({ data }) => {
      ;(data?.all ?? [])
        .filter((f) => f.status === "unverified")
        .forEach((f) => supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {}))
    })
  }, [])

  // ── TOTP ──────────────────────────────────────────────────────────────────

  async function startTotpEnroll() {
    setTotpError(null)
    setTotpLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType:   "totp",
      friendlyName: "Authenticator App",
      issuer:       "DienynasSync",
    })
    if (error || !data) {
      setTotpError(error?.message ?? "Failed to start enrollment")
      setTotpLoading(false)
      return
    }
    const state: TotpEnrollState = {
      factorId:  data.id,
      svgCode:   decodeSvgDataUri(data.totp.qr_code),
      secret:    data.totp.secret,
      expiresAt: Date.now() + ENROLL_TTL_MS,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setTotpEnroll(state)
    setTotpLoading(false)
  }

  async function confirmTotpEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (!totpEnroll) return
    setTotpError(null)
    setTotpLoading(true)
    const supabase = createClient()
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totpEnroll.factorId })
    if (cErr || !challenge) {
      setTotpError(cErr?.message ?? "Failed to create challenge")
      setTotpLoading(false)
      return
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId:    totpEnroll.factorId,
      challengeId: challenge.id,
      code:        totpCode.replace(/\s/g, ""),
    })
    if (vErr) {
      setTotpError("Invalid code — please try again.")
      setTotpLoading(false)
      return
    }
    sessionStorage.removeItem(STORAGE_KEY)
    setTotpEnroll(null)
    setTotpCode("")
    setSuccessMsg("Authenticator app added successfully.")
    setTimeout(() => setSuccessMsg(null), 4000)
    loadFactors()
    setTotpLoading(false)
  }

  function cancelTotpEnroll() {
    if (totpEnroll) {
      createClient().auth.mfa.unenroll({ factorId: totpEnroll.factorId }).catch(() => {})
    }
    sessionStorage.removeItem(STORAGE_KEY)
    setTotpEnroll(null)
    setTotpCode("")
    setTotpError(null)
  }

  async function removeFactor(factorId: string) {
    setRemovingId(factorId)
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (!error) {
      setSuccessMsg("Factor removed.")
      setTimeout(() => setSuccessMsg(null), 3000)
      loadFactors()
    }
    setRemovingId(null)
  }

  // ── Passkeys ──────────────────────────────────────────────────────────────

  async function registerPasskey(e: React.FormEvent, useAs2fa: boolean) {
    e.preventDefault()
    setKeyError(null)
    setKeyLoading(true)

    const optRes = await fetch("/api/auth/passkey/register/options", { method: "POST" })
    if (!optRes.ok) {
      setKeyError("Failed to start registration")
      setKeyLoading(false)
      return
    }
    const options = await optRes.json()

    let regResponse
    try {
      regResponse = await startRegistration({ optionsJSON: options })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setKeyError(msg.includes("cancel") || msg.includes("abort") ? "Cancelled" : msg)
      setKeyLoading(false)
      return
    }

    const friendlyName = useAs2fa ? keyNameMfa.trim() : keyNamePwdless.trim()
    const verRes = await fetch("/api/auth/passkey/register/verify", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ response: regResponse, friendlyName: friendlyName || undefined, useAs2fa }),
    })

    const verData = await verRes.json()
    if (!verRes.ok || !verData.verified) {
      setKeyError(verData.error ?? "Registration failed")
      setKeyLoading(false)
      return
    }

    if (useAs2fa) setKeyNameMfa("")
    else setKeyNamePwdless("")
    setSuccessMsg("Passkey added successfully.")
    setTimeout(() => setSuccessMsg(null), 4000)
    loadPasskeys()
    setKeyLoading(false)
  }

  async function togglePasskeyMode(id: string, useAs2fa: boolean) {
    const res = await fetch("/api/auth/passkey/update", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, use_as_2fa: useAs2fa }),
    })
    if (res.ok) loadPasskeys()
  }

  async function removePasskey(id: string) {
    setRemovingKey(id)
    const res = await fetch("/api/auth/passkey/remove", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    })
    if (res.ok) {
      setSuccessMsg("Passkey removed.")
      setTimeout(() => setSuccessMsg(null), 3000)
      loadPasskeys()
    }
    setRemovingKey(null)
  }

  // ── OAuth identity linking ─────────────────────────────────────────────────

  async function linkProvider(provider: "google" | "discord") {
    setLinkingProvider(provider)
    const supabase = createClient()
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/settings/security` },
    })
    if (error) {
      setSuccessMsg(`Failed to link ${provider}: ${error.message}`)
      setTimeout(() => setSuccessMsg(null), 4000)
    }
    setLinkingProvider(null)
  }

  async function unlinkIdentity(identity: UserIdentity) {
    setUnlinkingIdentity(identity.id)
    const supabase = createClient()
    const { error } = await supabase.auth.unlinkIdentity(identity)
    if (error) {
      setSuccessMsg(`Failed to unlink: ${error.message}`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } else {
      setSuccessMsg("Provider disconnected.")
      setTimeout(() => setSuccessMsg(null), 3000)
      loadIdentities()
    }
    setUnlinkingIdentity(null)
  }

  // ── Change password ────────────────────────────────────────────────────────

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setCpError(null)
    setCpLoading(true)
    const supabase = createClient()

    if (!userEmail) {
      setCpError("Could not retrieve your email. Please refresh and try again.")
      setCpLoading(false)
      return
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: userEmail, password: cpCurrent })
    if (signInErr) {
      setCpError("Current password is incorrect.")
      setCpLoading(false)
      return
    }

    if (hasTotp) {
      const totpFactor = verifiedFactors.find((f) => f.factor_type === "totp")
      if (totpFactor) {
        const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id })
        if (cErr || !challenge) {
          setCpError("Failed to create 2FA challenge.")
          setCpLoading(false)
          return
        }
        const { error: vErr } = await supabase.auth.mfa.verify({
          factorId:    totpFactor.id,
          challengeId: challenge.id,
          code:        cpTotp.replace(/\s/g, ""),
        })
        if (vErr) {
          setCpError("Invalid 2FA code — please try again.")
          setCpLoading(false)
          return
        }
      }
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: cpNew })
    if (updateErr) {
      setCpError(updateErr.message)
      setCpLoading(false)
      return
    }

    setCpCurrent("")
    setCpNew("")
    setCpTotp("")
    setSuccessMsg("Password changed successfully.")
    setTimeout(() => setSuccessMsg(null), 4000)
    setCpLoading(false)
  }

  // ─── Derived state ─────────────────────────────────────────────────────────

  const verifiedFactors   = factors.filter((f) => f.status === "verified")
  const hasTotp           = verifiedFactors.some((f) => f.factor_type === "totp")
  const twoFaPasskeys     = passkeys.filter((pk) => pk.use_as_2fa)
  const passwordlessKeys  = passkeys.filter((pk) => !pk.use_as_2fa)
  const googleIdentity    = identities.find((i) => i.provider === "google")
  const discordIdentity   = identities.find((i) => i.provider === "discord")

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-full">
      {/* ── Internal sidebar ───────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r border-[var(--bdr)] px-3 py-8 min-h-screen">
        <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Security
        </p>
        <nav className="space-y-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === id
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <main className="flex-1 p-8 max-w-2xl space-y-6">
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-lg px-4 py-3">
            {successMsg}
          </div>
        )}

        {/* ── Overview ─────────────────────────────────────────────── */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-white">Overview</h1>
              <p className="text-gray-400 text-sm mt-1">Your account security at a glance.</p>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl divide-y divide-[var(--bdr)]">
              {/* 2FA status */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Two-factor authentication</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {hasTotp ? "Authenticator app enabled" : "No second factor configured"}
                    {twoFaPasskeys.length > 0 ? ` · ${twoFaPasskeys.length} security key${twoFaPasskeys.length > 1 ? "s" : ""}` : ""}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  hasTotp || twoFaPasskeys.length > 0
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {hasTotp || twoFaPasskeys.length > 0 ? "Enabled" : "Disabled"}
                </span>
              </div>

              {/* Passkeys */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Passkeys</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {passkeys.length === 0
                      ? "No passkeys registered"
                      : `${passkeys.length} passkey${passkeys.length > 1 ? "s" : ""} · ${passwordlessKeys.length} passwordless`}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  passwordlessKeys.length > 0
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "bg-gray-500/20 text-gray-400"
                }`}>
                  {passwordlessKeys.length > 0 ? "Active" : "None"}
                </span>
              </div>

              {/* OAuth providers */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Social login</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {!googleIdentity && !discordIdentity
                      ? "No social providers connected"
                      : [googleIdentity && "Google", discordIdentity && "Discord"].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  googleIdentity || discordIdentity
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "bg-gray-500/20 text-gray-400"
                }`}>
                  {googleIdentity || discordIdentity ? "Connected" : "None"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Multi-factor authentication ───────────────────────────── */}
        {activeSection === "mfa" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-white">Multi-factor authentication</h1>
              <p className="text-gray-400 text-sm mt-1">
                Add a second factor that is required after entering your password.
              </p>
            </div>

            {/* Authenticator app */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Authenticator App
              </h2>

              {hasTotp && !totpEnroll ? (
                <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl divide-y divide-[var(--bdr)]">
                  {verifiedFactors.filter((f) => f.factor_type === "totp").map((f) => (
                    <div key={f.id} className="flex items-center justify-between px-4 py-3 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <AppIcon />
                        <div>
                          <p className="text-sm font-medium text-white">{f.friendly_name ?? "Authenticator App"}</p>
                          <p className="text-xs text-gray-500">
                            TOTP · Added {new Date(f.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFactor(f.id)}
                        disabled={removingId === f.id}
                        className="shrink-0 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                      >
                        {removingId === f.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  ))}
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-500">Remove the existing app to re-enroll.</p>
                  </div>
                </div>
              ) : totpEnroll ? (
                <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5 space-y-5">
                  <div>
                    <p className="text-sm font-medium text-white">Scan this QR code</p>
                    <p className="text-xs text-gray-500">
                      Use Google Authenticator, Authy, or any TOTP app. This code expires in 5 minutes.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <div className="bg-[var(--surface)] rounded-xl p-3 inline-flex">
                      <div
                        className="w-44 h-44 [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                        dangerouslySetInnerHTML={{ __html: totpEnroll.svgCode }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Can&apos;t scan? Enter this code manually:</p>
                    <code className="block text-xs text-[var(--accent)] bg-[var(--input-bg)] border border-[var(--bdr)] rounded px-3 py-2 tracking-widest break-all select-all">
                      {totpEnroll.secret}
                    </code>
                  </div>
                  <form onSubmit={confirmTotpEnroll} className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Enter the 6-digit code to confirm</label>
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
                        className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-[var(--fg)] text-lg tracking-widest text-center font-mono placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                        placeholder="000000"
                      />
                    </div>
                    {totpError && (
                      <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{totpError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={totpLoading || totpCode.replace(/\s/g, "").length < 6}
                        className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hov)] disabled:opacity-50 text-[var(--accent-fg)] font-medium rounded-lg py-2.5 text-sm transition-colors"
                      >
                        {totpLoading ? "Verifying…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelTotpEnroll}
                        className="px-4 py-2.5 rounded-lg border border-[var(--bdr)] text-gray-400 hover:text-white text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5">
                  <p className="text-sm text-gray-400 mb-4">
                    Use Google Authenticator, Authy, or any TOTP-compatible app as a second factor.
                  </p>
                  {totpError && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">{totpError}</p>
                  )}
                  <button
                    onClick={startTotpEnroll}
                    disabled={totpLoading}
                    className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hov)] disabled:opacity-50 text-[var(--accent-fg)] font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                  >
                    <AppIcon />
                    {totpLoading ? "Starting…" : "Set up authenticator app"}
                  </button>
                </div>
              )}
            </section>

            {/* 2FA passkeys */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Security Keys (2FA)
              </h2>

              {!loadingList && twoFaPasskeys.length > 0 && (
                <ul className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl divide-y divide-[var(--bdr)] mb-3">
                  {twoFaPasskeys.map((pk) => (
                    <PasskeyRow
                      key={pk.id}
                      pk={pk}
                      removingKey={removingKey}
                      onRemove={removePasskey}
                      onToggle={togglePasskeyMode}
                    />
                  ))}
                </ul>
              )}

              <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5">
                <p className="text-sm text-gray-400 mb-4">
                  Register a hardware key (YubiKey) or device biometric to use as a second factor alongside your password.
                </p>
                <form onSubmit={(e) => registerPasskey(e, true)} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nickname (optional)</label>
                    <input
                      type="text"
                      value={keyNameMfa}
                      onChange={(e) => setKeyNameMfa(e.target.value)}
                      maxLength={60}
                      className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-[var(--fg)] text-sm placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                      placeholder="e.g. YubiKey 5C"
                    />
                  </div>
                  {keyError && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{keyError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={keyLoading}
                    className="inline-flex items-center gap-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] disabled:opacity-50 border border-[var(--bdr)] text-[var(--fg)] font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                  >
                    <KeyIcon />
                    {keyLoading ? "Waiting for authenticator…" : "Add passkey"}
                  </button>
                </form>
              </div>
            </section>
          </div>
        )}

        {/* ── Passwordless login ────────────────────────────────────── */}
        {activeSection === "passwordless" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-white">Passwordless login</h1>
              <p className="text-gray-400 text-sm mt-1">
                Sign in without a password using a passkey or a social provider.
              </p>
            </div>

            {/* Passkeys */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Passkeys &amp; Security Keys
              </h2>

              {!loadingList && passwordlessKeys.length > 0 && (
                <ul className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl divide-y divide-[var(--bdr)] mb-3">
                  {passwordlessKeys.map((pk) => (
                    <PasskeyRow
                      key={pk.id}
                      pk={pk}
                      removingKey={removingKey}
                      onRemove={removePasskey}
                      onToggle={togglePasskeyMode}
                    />
                  ))}
                </ul>
              )}

              <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5">
                <p className="text-sm text-gray-400 mb-4">
                  Register Face ID, Touch ID, Windows Hello, or a hardware security key to sign in without a password.
                </p>
                <form onSubmit={(e) => registerPasskey(e, false)} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nickname (optional)</label>
                    <input
                      type="text"
                      value={keyNamePwdless}
                      onChange={(e) => setKeyNamePwdless(e.target.value)}
                      maxLength={60}
                      className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-[var(--fg)] text-sm placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                      placeholder="e.g. MacBook Touch ID"
                    />
                  </div>
                  {keyError && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{keyError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={keyLoading}
                    className="inline-flex items-center gap-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] disabled:opacity-50 border border-[var(--bdr)] text-[var(--fg)] font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
                  >
                    <KeyIcon />
                    {keyLoading ? "Waiting for authenticator…" : "Add passkey / security key"}
                  </button>
                </form>
              </div>
            </section>

            {/* Social providers */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Social Providers
              </h2>

              <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl divide-y divide-[var(--bdr)]">
                {/* Google */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔵</span>
                    <div>
                      <p className="text-sm font-medium text-white">Google</p>
                      <p className="text-xs text-gray-500">
                        {googleIdentity ? "Connected · sign in with your Google account" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {googleIdentity ? (
                    <button
                      onClick={() => unlinkIdentity(googleIdentity)}
                      disabled={unlinkingIdentity === googleIdentity.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      {unlinkingIdentity === googleIdentity.id ? "Removing…" : "Disconnect"}
                    </button>
                  ) : (
                    <button
                      onClick={() => linkProvider("google")}
                      disabled={linkingProvider === "google"}
                      className="text-xs bg-[var(--accent)] hover:bg-[var(--accent-hov)] disabled:opacity-50 text-[var(--accent-fg)] font-medium rounded-lg px-3 py-1.5 transition-colors"
                    >
                      {linkingProvider === "google" ? "Redirecting…" : "Add Google"}
                    </button>
                  )}
                </div>

                {/* Discord */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🟣</span>
                    <div>
                      <p className="text-sm font-medium text-white">Discord</p>
                      <p className="text-xs text-gray-500">
                        {discordIdentity ? "Connected · sign in with your Discord account" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {discordIdentity ? (
                    <button
                      onClick={() => unlinkIdentity(discordIdentity)}
                      disabled={unlinkingIdentity === discordIdentity.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      {unlinkingIdentity === discordIdentity.id ? "Removing…" : "Disconnect"}
                    </button>
                  ) : (
                    <button
                      onClick={() => linkProvider("discord")}
                      disabled={linkingProvider === "discord"}
                      className="text-xs bg-[var(--accent)] hover:bg-[var(--accent-hov)] disabled:opacity-50 text-[var(--accent-fg)] font-medium rounded-lg px-3 py-1.5 transition-colors"
                    >
                      {linkingProvider === "discord" ? "Redirecting…" : "Add Discord"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── Change password ───────────────────────────────────────── */}
        {activeSection === "password" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-white">Change password</h1>
              <p className="text-gray-400 text-sm mt-1">Update your account password.</p>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5">
              <form onSubmit={changePassword} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current password</label>
                  <input
                    type="password"
                    value={cpCurrent}
                    onChange={(e) => setCpCurrent(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-[var(--fg)] text-sm placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">New password</label>
                  <input
                    type="password"
                    value={cpNew}
                    onChange={(e) => setCpNew(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-[var(--fg)] text-sm placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                    placeholder="Minimum 8 characters"
                  />
                </div>
                {hasTotp && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Authenticator code <span className="text-[var(--accent)]">(required — 2FA is enabled)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9 ]*"
                      maxLength={7}
                      value={cpTotp}
                      onChange={(e) => setCpTotp(e.target.value)}
                      required
                      autoComplete="one-time-code"
                      className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-[var(--fg)] text-lg tracking-widest text-center font-mono placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                      placeholder="000000"
                    />
                  </div>
                )}
                {cpError && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{cpError}</p>
                )}
                <button
                  type="submit"
                  disabled={cpLoading || !cpCurrent || cpNew.length < 8 || (hasTotp && cpTotp.replace(/\s/g, "").length < 6)}
                  className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hov)] disabled:opacity-50 text-[var(--accent-fg)] font-medium rounded-lg py-2.5 text-sm transition-colors"
                >
                  {cpLoading ? "Changing password…" : "Change password"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PasskeyRow({
  pk,
  removingKey,
  onRemove,
  onToggle,
}: {
  pk: Passkey
  removingKey: string | null
  onRemove: (id: string) => void
  onToggle: (id: string, useAs2fa: boolean) => void
}) {
  return (
    <li className="flex items-center justify-between px-4 py-3 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0"><KeyIcon /></span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{pk.friendly_name ?? "Passkey"}</p>
          <p className="text-xs text-gray-500">
            {pk.device_type === "multiDevice" ? "Synced passkey" : "Single-device key"}
            {pk.backed_up ? " · Backed up" : ""}
            {" · "}Added {new Date(pk.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              onClick={() => onToggle(pk.id, false)}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                !pk.use_as_2fa
                  ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30"
                  : "text-gray-600 hover:text-gray-400 border border-transparent hover:border-[var(--bdr)] hover:bg-[var(--surface-2)]"
              }`}
            >
              Passwordless
            </button>
            <button
              onClick={() => onToggle(pk.id, true)}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                pk.use_as_2fa
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-gray-600 hover:text-gray-400 border border-transparent hover:border-[var(--bdr)] hover:bg-[var(--surface-2)]"
              }`}
            >
              Two-factor
            </button>
          </div>
        </div>
      </div>
      <button
        onClick={() => onRemove(pk.id)}
        disabled={removingKey === pk.id}
        className="shrink-0 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
      >
        {removingKey === pk.id ? "Removing…" : "Remove"}
      </button>
    </li>
  )
}

function AppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="M21 2l-9.6 9.6"/>
      <path d="M15.5 7.5l3 3L22 7l-3-3"/>
    </svg>
  )
}
