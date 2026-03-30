"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  BarChart2,
  Plug,
  ShieldCheck,
  LogOut,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { hasRole } from "@/lib/roles"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "./ThemeToggle"

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/courses",      label: "Courses",      icon: BookOpen },
  { href: "/calendar",     label: "Calendar",     icon: CalendarDays },
  { href: "/graphs",       label: "Graphs",       icon: BarChart2 },
  { href: "/integrations", label: "Integrations", icon: Plug },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  const [user,     setUser]     = useState<{ email: string } | null>(null)
  const [isAdmin,  setIsAdmin]  = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setUser({ email: data.user.email })
      if (data.user) setIsAdmin(hasRole(data.user, "ADMIN"))
    })
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [menuOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside
      className="flex flex-col w-60 shrink-0 min-h-screen px-3 py-6"
      style={{
        background: "var(--sidebar)",
        borderRight: "1px solid var(--s-bdr)",
      }}
    >
      {/* Header: avatar + divider + logo */}
      <div className="flex items-center gap-0 px-3 mb-6">
        {/* Avatar button */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-opacity hover:opacity-80 shrink-0"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            aria-label="Account menu"
          >
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </button>

          {menuOpen && (
            <div
              className="absolute left-0 top-full mt-1 w-56 rounded-xl shadow-xl z-50 py-1"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--s-bdr)",
              }}
            >
              <div
                className="px-4 py-2.5"
                style={{ borderBottom: "1px solid var(--s-bdr)" }}
              >
                <p className="text-xs" style={{ color: "var(--fg-muted)" }}>Signed in as</p>
                <p className="text-sm truncate mt-0.5" style={{ color: "var(--fg)" }}>
                  {user?.email ?? "…"}
                </p>
              </div>

              <Link
                href="/settings/security"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                style={{ color: "var(--fg-muted)" }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = "var(--s-active)"
                  ;(e.currentTarget as HTMLElement).style.color = "var(--fg)"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = ""
                  ;(e.currentTarget as HTMLElement).style.color = "var(--fg-muted)"
                }}
              >
                <ShieldCheck className="w-4 h-4" />
                Security settings
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors rounded-b-xl"
                style={{ color: "var(--fg-muted)" }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.1)"
                  ;(e.currentTarget as HTMLElement).style.color = "#f87171"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = ""
                  ;(e.currentTarget as HTMLElement).style.color = "var(--fg-muted)"
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Vertical separator */}
        <div
          className="w-px h-5 mx-3 shrink-0"
          style={{ background: "var(--s-bdr)" }}
        />

        {/* Logo */}
        <span
          className="text-sm font-bold tracking-tight leading-none"
          style={{ color: "var(--sidebar-fg)" }}
        >
          Dienynas
          <span style={{ color: "var(--s-muted)" }}> SYNC</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                active
                  ? { background: "var(--s-active)", color: "var(--sidebar-fg)" }
                  : { color: "var(--s-muted)" }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  ;(e.currentTarget as HTMLElement).style.color = "var(--sidebar-fg)"
                  ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  ;(e.currentTarget as HTMLElement).style.color = "var(--s-muted)"
                  ;(e.currentTarget as HTMLElement).style.background = ""
                }
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="my-2" style={{ borderTop: "1px solid var(--s-bdr)" }} />
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                pathname === "/admin" || pathname.startsWith("/admin/")
                  ? { background: "var(--s-active)", color: "var(--sidebar-fg)" }
                  : { color: "var(--s-muted)" }
              }
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* Bottom: theme toggle */}
      <div
        className="pt-3 mt-3 flex items-center"
        style={{ borderTop: "1px solid var(--s-bdr)" }}
      >
        <ThemeToggle
          className="hover:bg-white/10"
        />
        <span className="text-xs ml-1" style={{ color: "var(--s-muted)" }}>
          Toggle theme
        </span>
      </div>
    </aside>
  )
}
