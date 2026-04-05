// Replace these with values from web-app/.env.local
const KEYCLOAK_TOKEN_URL = "https://auth.yourdomain.com/realms/mdienynas/protocol/openid-connect/token"
const CLIENT_ID          = "mdienynas-extension"

export interface StoredSession {
  access_token:  string
  refresh_token: string
  expires_at:    number   // Unix timestamp (seconds)
  email:         string
}

export async function signIn(email: string, password: string): Promise<void> {
  const res = await fetch(KEYCLOAK_TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "password",
      client_id:  CLIENT_ID,
      username:   email,
      password,
      scope:      "openid email profile",
    }),
  })
  if (!res.ok) throw new Error("Wrong email or password.")
  const data = await res.json()
  const session: StoredSession = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    Math.floor(Date.now() / 1000) + (data.expires_in as number),
    email,
  }
  await chrome.storage.local.set({ session })
}

export async function getValidToken(): Promise<string | null> {
  const stored  = await chrome.storage.local.get("session")
  const session = stored.session as StoredSession | undefined
  if (!session) return null

  const now = Math.floor(Date.now() / 1000)
  if (session.expires_at - now > 60) return session.access_token

  // Refresh
  try {
    const res = await fetch(KEYCLOAK_TOKEN_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        grant_type:    "refresh_token",
        client_id:     CLIENT_ID,
        refresh_token: session.refresh_token,
      }),
    })
    if (!res.ok) {
      await chrome.storage.local.remove("session")
      return null
    }
    const data = await res.json()
    const updated: StoredSession = {
      ...session,
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    Math.floor(Date.now() / 1000) + (data.expires_in as number),
    }
    await chrome.storage.local.set({ session: updated })
    return updated.access_token
  } catch {
    await chrome.storage.local.remove("session")
    return null
  }
}

export async function getStoredSession(): Promise<StoredSession | null> {
  const stored = await chrome.storage.local.get("session")
  return (stored.session as StoredSession | undefined) ?? null
}

export async function getLastSync(): Promise<string | null> {
  const stored = await chrome.storage.local.get("lastSync")
  return (stored.lastSync as string | undefined) ?? null
}

export async function signOut(): Promise<void> {
  // Best-effort Keycloak logout (no session_id to revoke with ROPC)
  await chrome.storage.local.remove(["session", "lastSync"])
}
