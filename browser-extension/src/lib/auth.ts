// Replace these with values from web-app/.env.local
// NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SUPABASE_URL = "YOUR_SUPABASE_URL"
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"

export interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number // Unix timestamp (seconds)
  email: string
}

export async function signIn(email: string, password: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error("Wrong email or password.")
  const data = await res.json()
  const session: StoredSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in as number),
    email,
  }
  await chrome.storage.local.set({ session })
}

export async function getValidToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get("session")
  const session = stored.session as StoredSession | undefined
  if (!session) return null

  const now = Math.floor(Date.now() / 1000)
  if (session.expires_at - now > 60) return session.access_token

  // Token expires in <60s — refresh it
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    })
    if (!res.ok) {
      await chrome.storage.local.remove("session")
      return null
    }
    const data = await res.json()
    const updated: StoredSession = {
      ...session,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in as number),
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
  const stored = await chrome.storage.local.get("session")
  const session = stored.session as StoredSession | undefined
  if (session) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
      })
    } catch {
      // Best-effort — still clear local session
    }
  }
  await chrome.storage.local.remove(["session", "lastSync"])
}
