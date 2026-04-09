"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function CheckoutAuth() {
  const router = useRouter()

  useEffect(() => {
    router.push("/login?callbackUrl=/checkout/payment")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <p style={{ color: "var(--fg-muted)" }}>Redirecting to sign in…</p>
    </div>
  )
}
