import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "./server"
import { NextRequest } from "next/server"
import type { SupabaseClient, User } from "@supabase/supabase-js"

type AuthResult = {
  supabase: SupabaseClient
  user: User
}

export async function getAuthenticatedClient(req: NextRequest): Promise<AuthResult | null> {
  // Try cookie auth first (standard web app sessions)
  const cookieSupabase = await createServerClient()
  const { data: { user: cookieUser } } = await cookieSupabase.auth.getUser()
  if (cookieUser) return { supabase: cookieSupabase, user: cookieUser }

  // Fall back to Bearer JWT (browser extension)
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  const jwt = authHeader.slice(7)

  const jwtSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    }
  )
  const { data: { user: jwtUser } } = await jwtSupabase.auth.getUser(jwt)
  if (!jwtUser) return null
  return { supabase: jwtSupabase, user: jwtUser }
}
