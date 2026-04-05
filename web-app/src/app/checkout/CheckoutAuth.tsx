"use client"

import { signIn } from "next-auth/react"
import { useEffect } from "react"

export function CheckoutAuth() {
  useEffect(() => {
    signIn("keycloak", { callbackUrl: "/checkout/payment" })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <p style={{ color: "var(--fg-muted)" }}>Redirecting to sign in…</p>
    </div>
  )
}
