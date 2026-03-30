import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * /auth/callback — exchanges the OAuth `code` for a Supabase session.
 * Supabase redirects here after Google / Apple sign-in.
 * Must be registered as the redirect URL in the Supabase dashboard:
 *   Authentication → URL Configuration → Redirect URLs → <origin>/auth/callback
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code  = searchParams.get("code")
  const next  = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if MFA challenge is required after OAuth sign-in
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
        return NextResponse.redirect(new URL("/auth/mfa", origin))
      }
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Exchange failed or no code — send to login with an error flag
  return NextResponse.redirect(new URL("/login?error=oauth", origin))
}
