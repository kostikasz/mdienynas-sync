"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, Lock, KeyRound, Fingerprint } from "lucide-react"
import { startRegistration } from "@simplewebauthn/browser"

type Section = "overview" | "mfa" | "password" | "passkeys"

type TotpFactor = {
  id:          string
  userLabel:   string
  createdDate: number
}

type TotpSetupState = {
  secret:    string
  svg:       string
  expiresAt: number
}

const STORAGE_KEY   = "totp_setup"
const ENROLL_TTL_MS = 5 * 60 * 1000

type PasskeyItem = {
  id:         string
  name:       string
  createdAt:  string
  transports: string[]
}

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",                   icon: ShieldCheck },
  { id: "mfa",       label: "Multi-factor authentication", icon: Lock },
  { id: "passkeys",  label: "Passkeys",                   icon: Fingerprint },
  { id: "password",  label: "Change password",             icon: KeyRound },
]

export default function SecurityClient() {
  const [activeSection, setActiveSection] = useState<Section>("overview")

  const [totpFactors,  setTotpFactors]  = useState<TotpFactor[]>([])
  const [loadingMfa,   setLoadingMfa]   = useState(true)
  const [removingId,   setRemovingId]   = useState<string | null>(null)

  const [setup,        setSetup]        = useState<TotpSetupState | null>(null)
  const [totpCode,     setTotpCode]     = useState("")
  const [totpLabel,    setTotpLabel]    = useState("")
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError,   setSetupError]   = useState<string | null>(null)

  const [cpCurrent,    setCpCurrent]    = useState("")
  const [cpNew,        setCpNew]        = useState("")
  const [cpLoading,    setCpLoading]    = useState(false)
  const [cpError,      setCpError]      = useState<string | null>(null)

  const [passkeys,        setPasskeys]        = useState<PasskeyItem[]>([])
  const [loadingPasskeys, setLoadingPasskeys] = useState(true)
  const [pkName,          setPkName]          = useState("")
  const [pkLoading,       setPkLoading]       = useState(false)
  const [pkError,         setPkError]         = useState<string | null>(null)
  const [removingPkId,    setRemovingPkId]    = useState<string | null>(null)

  const [successMsg,   setSuccessMsg]   = useState<string | null>(null)

  function flash(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  async function loadMfa() {
    setLoadingMfa(true)
    const res  = await fetch("/api/settings/mfa")
    if (res.ok) {
      const data = await res.json()
      setTotpFactors(data.totp ?? [])
    }
    setLoadingMfa(false)
  }

  async function loadPasskeys() {
    setLoadingPasskeys(true)
    const res = await fetch("/api/auth/passkey/list")
    if (res.ok) {
      const data = await res.json()
      setPasskeys(data.passkeys ?? [])
    }
    setLoadingPasskeys(false)
  }

  useEffect(() => {
    loadMfa()
    loadPasskeys()
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const saved = JSON.parse(raw) as TotpSetupState
        if (Date.now() < saved.expiresAt) { setSetup(saved); return }
      } catch { /* ignore */ }
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // ── TOTP ──────────────────────────────────────────────────────────────────

  async function startSetup() {
    setSetupError(null)
    setSetupLoading(true)
    const res = await fetch("/api/settings/totp/setup", { method: "POST" })
    if (!res.ok) { setSetupError("Failed to start setup."); setSetupLoading(false); return }
    const data = await res.json() as { secret: string; svg: string }
    const state: TotpSetupState = { ...data, expiresAt: Date.now() + ENROLL_TTL_MS }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setSetup(state)
    setSetupLoading(false)
  }

  function cancelSetup() {
    sessionStorage.removeItem(STORAGE_KEY)
    setSetup(null)
    setTotpCode("")
    setTotpLabel("")
    setSetupError(null)
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault()
    if (!setup) return
    setSetupError(null)
    setSetupLoading(true)
    const res = await fetch("/api/settings/totp/confirm", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ secret: setup.secret, code: totpCode, label: totpLabel || undefined }),
    })
    if (!res.ok) {
      const d = await res.json()
      setSetupError(d.error ?? "Invalid code — please try again.")
      setSetupLoading(false)
      return
    }
    sessionStorage.removeItem(STORAGE_KEY)
    setSetup(null)
    setTotpCode("")
    setTotpLabel("")
    flash("Authenticator app added successfully.")
    loadMfa()
    setSetupLoading(false)
  }

  async function removeFactor(id: string) {
    setRemovingId(id)
    const res = await fetch(`/api/settings/mfa/${id}`, { method: "DELETE" })
    if (res.ok) { flash("Factor removed."); loadMfa() }
    setRemovingId(null)
  }

  // ── Passkeys ───────────────────────────────────────────────────────────────

  async function registerPasskey(e: React.FormEvent) {
    e.preventDefault()
    setPkError(null)
    setPkLoading(true)
    try {
      const optRes = await fetch("/api/auth/passkey/register/options", { method: "POST" })
      if (!optRes.ok) throw new Error("Failed to get registration options")
      const options = await optRes.json()

      const regResponse = await startRegistration({ optionsJSON: options })

      const verRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: regResponse, name: pkName || "Passkey" }),
      })
      if (!verRes.ok) throw new Error("Registration verification failed")

      setPkName("")
      flash("Passkey added successfully.")
      loadPasskeys()
    } catch {
      setPkError("Failed to register passkey. Make sure your device supports passkeys and try again.")
    } finally {
      setPkLoading(false)
    }
  }

  async function removePasskey(id: string) {
    setRemovingPkId(id)
    const res = await fetch("/api/auth/passkey/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { flash("Passkey removed."); loadPasskeys() }
    setRemovingPkId(null)
  }

  // ── Password ───────────────────────────────────────────────────────────────

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setCpError(null)
    setCpLoading(true)
    const res = await fetch("/api/settings/password", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ currentPassword: cpCurrent, newPassword: cpNew }),
    })
    if (!res.ok) {
      const d = await res.json()
      setCpError(d.error ?? "Failed to change password.")
      setCpLoading(false)
      return
    }
    setCpCurrent("")
    setCpNew("")
    flash("Password changed successfully.")
    setCpLoading(false)
  }

  const hasTotp      = totpFactors.length > 0
  const hasPasskeys  = passkeys.length > 0

  return (
    <div className="flex min-h-full">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-[var(--bdr)] px-3 py-8 min-h-screen">
        <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Security</p>
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

      {/* Content */}
      <main className="flex-1 p-8 max-w-2xl space-y-6">
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-lg px-4 py-3">
            {successMsg}
          </div>
        )}

        {/* Overview */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--fg)" }}>Overview</h1>
              <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>Your account security at a glance.</p>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl divide-y divide-[var(--bdr)]">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>Two-factor authentication</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
                    {loadingMfa ? "Loading…" : hasTotp ? `${totpFactors.length} authenticator app${totpFactors.length > 1 ? "s" : ""}` : "No second factor configured"}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  hasTotp ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {hasTotp ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>Passkeys</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
                    {loadingPasskeys ? "Loading…" : hasPasskeys ? `${passkeys.length} passkey${passkeys.length > 1 ? "s" : ""} registered` : "No passkeys registered"}
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection("passkeys")}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--bdr)", color: "var(--fg-muted)" }}
                >
                  Manage
                </button>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>Password</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>Change your account password at any time.</p>
                </div>
                <button
                  onClick={() => setActiveSection("password")}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--bdr)", color: "var(--fg-muted)" }}
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MFA */}
        {activeSection === "mfa" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--fg)" }}>Multi-factor authentication</h1>
              <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>Require a second factor after your password.</p>
            </div>

            {/* Existing factors */}
            {!loadingMfa && totpFactors.length > 0 && !setup && (
              <ul className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl divide-y divide-[var(--bdr)]">
                {totpFactors.map((f) => (
                  <li key={f.id} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>{f.userLabel}</p>
                      <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                        TOTP · Added {new Date(f.createdDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFactor(f.id)}
                      disabled={removingId === f.id}
                      className="shrink-0 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      {removingId === f.id ? "Removing…" : "Remove"}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Setup flow */}
            {setup ? (
              <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5 space-y-5">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>Scan this QR code</p>
                  <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
                    Use Google Authenticator, Authy, or any TOTP app. Expires in 5 minutes.
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="bg-white rounded-xl p-3 inline-flex">
                    <div
                      className="w-44 h-44 [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                      dangerouslySetInnerHTML={{ __html: setup.svg }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--fg-muted)" }}>Can&apos;t scan? Enter this code manually:</p>
                  <code className="block text-xs bg-[var(--input-bg)] border border-[var(--bdr)] rounded px-3 py-2 tracking-widest break-all select-all" style={{ color: "var(--accent)" }}>
                    {setup.secret}
                  </code>
                </div>
                <form onSubmit={confirmSetup} className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--fg-muted)" }}>Nickname (optional)</label>
                    <input
                      type="text"
                      value={totpLabel}
                      onChange={(e) => setTotpLabel(e.target.value)}
                      maxLength={60}
                      className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                      style={{ color: "var(--fg)" }}
                      placeholder="e.g. Authy on iPhone"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "var(--fg-muted)" }}>Enter the 6-digit code to confirm</label>
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
                      className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-lg tracking-widest text-center font-mono focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                      style={{ color: "var(--fg)" }}
                      placeholder="000000"
                    />
                  </div>
                  {setupError && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{setupError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={setupLoading || totpCode.replace(/\s/g, "").length < 6}
                      className="flex-1 font-medium rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                    >
                      {setupLoading ? "Verifying…" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelSetup}
                      className="px-4 py-2.5 rounded-lg border border-[var(--bdr)] text-sm transition-colors"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5">
                <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>
                  {hasTotp
                    ? "Add another authenticator app as a backup second factor."
                    : "Use Google Authenticator, Authy, or any TOTP app as a second factor."}
                </p>
                {setupError && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">{setupError}</p>
                )}
                <button
                  onClick={startSetup}
                  disabled={setupLoading}
                  className="font-medium rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  {setupLoading ? "Starting…" : "Set up authenticator app"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Passkeys */}
        {activeSection === "passkeys" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--fg)" }}>Passkeys</h1>
              <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
                Sign in without a password using your device&apos;s biometrics or a security key.
              </p>
            </div>

            {/* Existing passkeys */}
            {!loadingPasskeys && passkeys.length > 0 && (
              <ul className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl divide-y divide-[var(--bdr)]">
                {passkeys.map((pk) => (
                  <li key={pk.id} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>{pk.name}</p>
                        <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                          Added {new Date(pk.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {pk.transports.length > 0 && ` · ${pk.transports.join(", ")}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removePasskey(pk.id)}
                      disabled={removingPkId === pk.id}
                      className="shrink-0 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      {removingPkId === pk.id ? "Removing…" : "Remove"}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {loadingPasskeys && (
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>Loading…</p>
            )}

            {/* Register new passkey */}
            <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5">
              <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>
                {passkeys.length > 0
                  ? "Add another passkey as a backup (e.g. a security key or another device)."
                  : "Add a passkey to sign in with Face ID, Touch ID, Windows Hello, or a security key."}
              </p>
              <form onSubmit={registerPasskey} className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--fg-muted)" }}>Nickname (optional)</label>
                  <input
                    type="text"
                    value={pkName}
                    onChange={(e) => setPkName(e.target.value)}
                    maxLength={60}
                    className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                    style={{ color: "var(--fg)" }}
                    placeholder="e.g. MacBook Touch ID"
                  />
                </div>
                {pkError && (
                  <p className="text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" style={{ color: "#dc2626" }}>{pkError}</p>
                )}
                <button
                  type="submit"
                  disabled={pkLoading}
                  className="font-medium rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  {pkLoading ? "Registering…" : "Add passkey"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Password */}
        {activeSection === "password" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--fg)" }}>Change password</h1>
              <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>Update your account password.</p>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5">
              <form onSubmit={changePassword} className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--fg-muted)" }}>Current password</label>
                  <input
                    type="password"
                    value={cpCurrent}
                    onChange={(e) => setCpCurrent(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                    style={{ color: "var(--fg)" }}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--fg-muted)" }}>New password</label>
                  <input
                    type="password"
                    value={cpNew}
                    onChange={(e) => setCpNew(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full bg-[var(--input-bg)] border border-[var(--bdr)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--input-focus)] transition-colors"
                    style={{ color: "var(--fg)" }}
                    placeholder="Minimum 8 characters"
                  />
                </div>
                {cpError && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{cpError}</p>
                )}
                <button
                  type="submit"
                  disabled={cpLoading || !cpCurrent || cpNew.length < 8}
                  className="w-full font-medium rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
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
