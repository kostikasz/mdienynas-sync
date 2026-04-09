"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Download, CheckCircle, Circle, RefreshCw, Unlink, ExternalLink } from "lucide-react"

interface ConnectionInfo {
  last_synced_at: string | null
  connected_at:   string | null
  metadata?:      Record<string, string> | null
}

interface Props {
  connected: Record<string, ConnectionInfo>
}

export default function IntegrationsClient({ connected: initialConnected }: Props) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [connected,  setConnected]  = useState(initialConnected)
  const [msg,        setMsg]        = useState<{ text: string; ok: boolean } | null>(null)
  const [syncing,    setSyncing]    = useState<string | null>(null)
  const [unlinking,  setUnlinking]  = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  // Notion DB ID input
  const [notionDbId,      setNotionDbId]      = useState((initialConnected["notion"]?.metadata?.database_id) ?? "")
  const [savingNotionDb,  setSavingNotionDb]  = useState(false)

  useEffect(() => {
    const connectedParam = searchParams.get("connected")
    const errorParam     = searchParams.get("error")
    if (connectedParam === "gcal") {
      setMsg({ text: "Google Calendar connected!", ok: true })
      refreshConnected()
    } else if (connectedParam === "notion") {
      setMsg({ text: "Notion connected! Enter your database ID below to enable sync.", ok: true })
      refreshConnected()
    } else if (errorParam === "gcal_denied") {
      setMsg({ text: "Google Calendar connection cancelled.", ok: false })
    } else if (errorParam === "gcal_token") {
      setMsg({ text: "Failed to connect Google Calendar. Please try again.", ok: false })
    } else if (errorParam === "notion_denied") {
      setMsg({ text: "Notion connection cancelled.", ok: false })
    } else if (errorParam === "notion_token") {
      setMsg({ text: "Failed to connect Notion. Please try again.", ok: false })
    }
    if (connectedParam || errorParam) {
      // Clear params from URL
      router.replace("/integrations")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshConnected() {
    const res = await fetch("/api/integrations/status")
    if (res.ok) {
      const data = await res.json()
      setConnected(data.connected ?? {})
    }
  }

  function showMsg(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 5000)
  }

  async function downloadIcs() {
    setDownloading(true)
    try {
      const res = await fetch("/api/integrations/apple-cal")
      if (!res.ok) {
        const err = await res.json()
        showMsg(`Error: ${err.error}`, false)
        return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = "mdienynas.ics"
      a.click()
      URL.revokeObjectURL(url)
      showMsg("Downloaded! Open the file to import into Apple Calendar, Outlook, or Google Calendar.", true)
    } finally {
      setDownloading(false)
    }
  }

  async function connectGcal() {
    window.location.href = "/api/integrations/gcal"
  }

  async function connectNotion() {
    window.location.href = "/api/integrations/notion"
  }

  async function disconnect(provider: string) {
    setUnlinking(provider)
    const res = await fetch(`/api/integrations/${provider === "google_calendar" ? "gcal" : "notion"}`, { method: "DELETE" })
    if (res.ok) {
      setConnected((prev) => {
        const next = { ...prev }
        delete next[provider]
        return next
      })
      showMsg(`${provider === "google_calendar" ? "Google Calendar" : "Notion"} disconnected.`, true)
    } else {
      showMsg("Failed to disconnect. Please try again.", false)
    }
    setUnlinking(null)
  }

  async function sync(provider: string) {
    setSyncing(provider)
    const endpoint = provider === "google_calendar" ? "gcal" : "notion"
    const res = await fetch(`/api/integrations/${endpoint}`, { method: "POST" })
    const data = await res.json()
    if (res.ok) {
      const detail = provider === "google_calendar"
        ? `Created ${data.created} events.`
        : `Synced ${data.synced} courses.`
      showMsg(`Sync complete. ${detail}`, true)
      refreshConnected()
    } else {
      showMsg(data.error ?? "Sync failed.", false)
    }
    setSyncing(null)
  }

  async function saveNotionDbId() {
    setSavingNotionDb(true)
    const res = await fetch("/api/integrations/notion/database", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ database_id: notionDbId.trim() }),
    })
    if (res.ok) {
      showMsg("Notion database saved.", true)
      refreshConnected()
    } else {
      const data = await res.json()
      showMsg(data.error ?? "Failed to save database ID.", false)
    }
    setSavingNotionDb(false)
  }

  const notionConn = connected["notion"]
  const gcalConn   = connected["google_calendar"]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--fg)]">Integrations</h1>

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${
          msg.ok
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
            : "bg-red-500/10 border-red-500/30 text-red-600"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Apple Calendar */}
        <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5 shadow-[var(--shadow)]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-[var(--fg)]">Apple Calendar</h2>
                <span className="text-xs bg-emerald-500/15 text-emerald-700 px-2 py-0.5 rounded-full">No auth needed</span>
              </div>
              <p className="text-sm text-[var(--fg-muted)] mb-4">
                Download a <code className="text-[var(--accent)] text-xs">.ics</code> file with all your homework entries.
                Import it into Apple Calendar, Google Calendar, Outlook, or any calendar app.
              </p>
              <button
                onClick={downloadIcs}
                disabled={downloading}
                className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hov)] disabled:opacity-50 text-[var(--accent-fg)] font-medium rounded-lg px-4 py-2 text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                {downloading ? "Generating…" : "Download .ics"}
              </button>
            </div>
          </div>
        </div>

        {/* Google Calendar */}
        <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5 shadow-[var(--shadow)]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="2" stroke="var(--accent)" strokeWidth="1.5"/>
                <path d="M3 9h18" stroke="var(--accent)" strokeWidth="1.5"/>
                <path d="M8 2v3M16 2v3" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-[var(--fg)]">Google Calendar</h2>
                {gcalConn ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-[var(--fg-muted)]">
                    <Circle className="w-3 h-3" /> Not connected
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--fg-muted)] mb-4">
                Sync your assignment due dates as calendar events. Requires a Google account.
              </p>
              {gcalConn && (
                <p className="text-xs text-[var(--fg-muted)] mb-3">
                  Connected {gcalConn.connected_at ? new Date(gcalConn.connected_at).toLocaleDateString() : ""}
                  {" · "}Last synced:{" "}
                  {gcalConn.last_synced_at ? new Date(gcalConn.last_synced_at).toLocaleString() : "Never"}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {gcalConn ? (
                  <>
                    <button
                      onClick={() => sync("google_calendar")}
                      disabled={syncing === "google_calendar"}
                      className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hov)] disabled:opacity-50 text-[var(--accent-fg)] font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing === "google_calendar" ? "animate-spin" : ""}`} />
                      {syncing === "google_calendar" ? "Syncing…" : "Sync now"}
                    </button>
                    <button
                      onClick={() => disconnect("google_calendar")}
                      disabled={unlinking === "google_calendar"}
                      className="inline-flex items-center gap-2 border border-[var(--bdr)] text-[var(--fg-muted)] hover:text-red-600 hover:border-red-300 disabled:opacity-50 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                    >
                      <Unlink className="w-4 h-4" />
                      {unlinking === "google_calendar" ? "Disconnecting…" : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={connectGcal}
                    className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hov)] text-[var(--accent-fg)] font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Connect Google Calendar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notion */}
        <div className="bg-[var(--surface)] border border-[var(--bdr)] rounded-xl p-5 shadow-[var(--shadow)]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[var(--accent)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.5 3.75a.75.75 0 0 0-.75.75v15c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75v-15a.75.75 0 0 0-.75-.75h-15zm1.5 1.5h12v12h-12v-12zm2.25 2.25v7.5h1.5v-4.5l2.25 4.5h1.5v-7.5h-1.5v4.5l-2.25-4.5h-1.5z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-[var(--fg)]">Notion</h2>
                {notionConn ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-[var(--fg-muted)]">
                    <Circle className="w-3 h-3" /> Not connected
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--fg-muted)] mb-4">
                Push your course grades to a Notion database. Requires a Notion integration with OAuth.
              </p>

              {notionConn && (
                <>
                  <p className="text-xs text-[var(--fg-muted)] mb-3">
                    Connected {notionConn.connected_at ? new Date(notionConn.connected_at).toLocaleDateString() : ""}
                    {" · "}Last synced:{" "}
                    {notionConn.last_synced_at ? new Date(notionConn.last_synced_at).toLocaleString() : "Never"}
                  </p>

                  {/* Database ID input */}
                  <div className="mb-3">
                    <label className="block text-xs text-[var(--fg-muted)] mb-1">
                      Notion Database ID{" "}
                      <a
                        href="https://www.notion.so/my-integrations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[var(--accent)] hover:text-[var(--accent-hov)]"
                      >
                        <ExternalLink className="w-3 h-3" /> Manage integrations
                      </a>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={notionDbId}
                        onChange={(e) => setNotionDbId(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--input-bdr)] rounded-lg px-3 py-2 text-[var(--fg)] text-sm placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--input-focus)] transition-colors font-mono"
                      />
                      <button
                        onClick={saveNotionDbId}
                        disabled={savingNotionDb || !notionDbId.trim()}
                        className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--bdr)] disabled:opacity-50 text-[var(--fg)] text-sm rounded-lg transition-colors"
                      >
                        {savingNotionDb ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 flex-wrap">
                {notionConn ? (
                  <>
                    <button
                      onClick={() => sync("notion")}
                      disabled={syncing === "notion" || !notionConn.metadata?.database_id}
                      className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hov)] disabled:opacity-50 text-[var(--accent-fg)] font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing === "notion" ? "animate-spin" : ""}`} />
                      {syncing === "notion" ? "Syncing…" : "Sync now"}
                    </button>
                    <button
                      onClick={() => disconnect("notion")}
                      disabled={unlinking === "notion"}
                      className="inline-flex items-center gap-2 border border-[var(--bdr)] text-[var(--fg-muted)] hover:text-red-600 hover:border-red-300 disabled:opacity-50 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                    >
                      <Unlink className="w-4 h-4" />
                      {unlinking === "notion" ? "Disconnecting…" : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={connectNotion}
                    className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hov)] text-[var(--accent-fg)] font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Connect Notion
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
