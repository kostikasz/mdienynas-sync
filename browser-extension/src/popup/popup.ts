document.addEventListener("DOMContentLoaded", async () => {
  const stored = await chrome.storage.local.get(["session", "lastSync"])
  if (stored.session) {
    showMain(stored.session.email as string, stored.lastSync as string | undefined)
  } else {
    showLogin()
  }

  document.getElementById("btn-login")!.addEventListener("click", handleLogin)
  document.getElementById("btn-logout")!.addEventListener("click", handleLogout)
  document.getElementById("btn-sync")!.addEventListener("click", handleSync)
  document.getElementById("password")!.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") handleLogin()
  })
})

function showLogin() {
  document.getElementById("view-login")!.classList.remove("hidden")
  document.getElementById("view-main")!.classList.add("hidden")
  ;(document.getElementById("login-error") as HTMLElement).classList.add("hidden")
  ;(document.getElementById("email") as HTMLInputElement).value = ""
  ;(document.getElementById("password") as HTMLInputElement).value = ""
}

function showMain(email: string, lastSync?: string) {
  document.getElementById("view-login")!.classList.add("hidden")
  document.getElementById("view-main")!.classList.remove("hidden")
  document.getElementById("user-email")!.textContent = email
  setStatus(
    lastSync ? `Last synced: ${formatAgo(new Date(lastSync))}` : "Never synced",
    "idle"
  )
}

function setStatus(text: string, type: "idle" | "syncing" | "success" | "error") {
  const el = document.getElementById("sync-status")!
  el.textContent = text
  el.className = `status-${type}`
}

function formatAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

async function handleLogin() {
  const email = (document.getElementById("email") as HTMLInputElement).value.trim()
  const password = (document.getElementById("password") as HTMLInputElement).value
  const errorEl = document.getElementById("login-error")!
  const btn = document.getElementById("btn-login") as HTMLButtonElement
  if (!email || !password) return

  btn.disabled = true
  btn.textContent = "Signing in..."
  errorEl.classList.add("hidden")

  const result = await chrome.runtime.sendMessage({ type: "SIGN_IN", email, password })
  if (result?.error) {
    errorEl.textContent = "Wrong email or password."
    errorEl.classList.remove("hidden")
    btn.disabled = false
    btn.textContent = "Sign in"
  } else {
    showMain(email)
  }
}

async function handleLogout() {
  await chrome.runtime.sendMessage({ type: "SIGN_OUT" })
  showLogin()
}

async function handleSync() {
  const btn = document.getElementById("btn-sync") as HTMLButtonElement
  btn.disabled = true
  setStatus("⟳ Syncing…", "syncing")

  const result = await chrome.runtime.sendMessage({ type: "SYNC" })

  if (result?.error) {
    setStatus(`✗ ${result.error as string}`, "error")
  } else {
    const { courses, homework } = result as { courses: number; homework: number }
    setStatus(`✓ Synced — ${courses} courses, ${homework} homework entries`, "success")
  }
  btn.disabled = false
}
