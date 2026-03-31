import { PublicNavbar } from "@/components/PublicNavbar"
import Link from "next/link"

function CheckCircleIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: "var(--accent)" }}
    >
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <PublicNavbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className="rounded-2xl p-10 max-w-md w-full text-center"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--bdr)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div className="flex justify-center mb-6">
            <CheckCircleIcon />
          </div>

          <h1
            className="text-2xl font-bold mb-3"
            style={{ color: "var(--fg)" }}
          >
            Payment successful!
          </h1>

          <p
            className="text-sm leading-relaxed mb-8"
            style={{ color: "var(--fg-muted)" }}
          >
            Your Pro subscription is now active. Welcome to Dienynas SYNC Pro.
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full font-semibold rounded-lg py-3 text-sm transition-colors"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Go to dashboard →
          </Link>
        </div>
      </div>
    </div>
  )
}
