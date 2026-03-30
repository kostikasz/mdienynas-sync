"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "./ThemeToggle"

export function PublicNavbar() {
  const pathname = usePathname()
  const isLogin    = pathname === "/login"
  const isRegister = pathname === "/register"

  // On login page: only show "Get started"
  // On register page: only show "Sign in"
  // On homepage: show both
  const showSignIn     = !isLogin && !isRegister
  const showGetStarted = !isRegister
  const showSignInAlt  = isRegister

  return (
    <nav
      className="flex items-center justify-between px-6 sm:px-8 py-4"
      style={{ borderBottom: "1px solid var(--bdr)" }}
    >
      <Link
        href="/"
        className="text-sm font-bold tracking-tight transition-opacity hover:opacity-80"
        style={{ color: "var(--fg)" }}
      >
        Dienynas<span style={{ color: "var(--accent)" }}> SYNC</span>
      </Link>

      <div className="flex items-center gap-1">
        <ThemeToggle />

        {showSignIn && (
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            Sign in
          </Link>
        )}

        {showGetStarted && (
          <Link
            href="/register"
            className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ml-1"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Get started
          </Link>
        )}

        {showSignInAlt && (
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            style={{ border: "1px solid var(--bdr)", color: "var(--fg-muted)" }}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
