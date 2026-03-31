import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Route categories
  const isAuthRoute   = pathname.startsWith("/login") || pathname.startsWith("/register")
  // MFA page and OAuth callback must always be reachable mid-auth
  const isMfaRoute    = pathname.startsWith("/auth/")
  // API routes handle auth themselves and must return JSON 401, not an HTML redirect
  const isApiRoute    = pathname.startsWith("/api")
  const isPublic      = pathname === "/" || isAuthRoute || isMfaRoute || isApiRoute

  // ── No session → send to login (except public routes) ──────────────────────
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user) {
    // ── Enforce MFA: AAL1 session is not enough when AAL2 is required ──────────
    // getAuthenticatorAssuranceLevel() reads the JWT locally — no network call.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const needsMfa = aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel

    if (needsMfa && !isMfaRoute && !isApiRoute) {
      // User has TOTP enrolled but hasn't verified it yet — block all non-MFA routes
      const url = request.nextUrl.clone()
      url.pathname = "/auth/mfa"
      return NextResponse.redirect(url)
    }

    // ── Authenticated user on login/register → send to dashboard ───────────────
    if (isAuthRoute && !needsMfa) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
