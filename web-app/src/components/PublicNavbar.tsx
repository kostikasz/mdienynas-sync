"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "./ThemeToggle"

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Pricing",  href: "/#pricing"  },
  { label: "About",    href: "/#about"    },
]

export function PublicNavbar() {
  const pathname = usePathname()
  const isHome = pathname === "/"

  return (
    <nav
      className="sticky top-0 z-50 flex items-center px-6 sm:px-10 py-3 backdrop-blur-md"
      style={{
        borderBottom: "1px solid var(--bdr)",
        background: "color-mix(in srgb, var(--bg) 85%, transparent)",
      }}
    >
      {/* Logo — left */}
      <div className="flex-none w-36">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight transition-opacity hover:opacity-80"
          style={{ color: "var(--fg)" }}
        >
          Dienynas<span style={{ color: "var(--accent)" }}> SYNC</span>
        </Link>
      </div>

      {/* Center nav links — only on homepage */}
      <div className="flex-1 flex justify-center">
        {isHome && (
          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                style={{ color: "var(--fg-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-muted)")}
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Auth — right */}
      <div className="flex-none w-36 flex items-center justify-end gap-1">
        <ThemeToggle />

        <Link
          href="/api/auth/signin"
          className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          style={{ color: "var(--fg-muted)" }}
        >
          Sign in
        </Link>

        <Link
          href="/api/auth/signin"
          className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Get started
        </Link>
      </div>
    </nav>
  )
}
