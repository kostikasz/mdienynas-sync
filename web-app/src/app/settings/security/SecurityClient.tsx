"use client"

import { ExternalLink } from "lucide-react"

export default function SecurityClient() {
  const keycloakAccountUrl = `${process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER?.replace("/realms/", "/realms/")}/account`

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--fg)" }}>Security</h1>
      <p className="text-sm mb-8" style={{ color: "var(--fg-muted)" }}>
        Passwords, passkeys, and two-factor authentication are managed by the identity provider.
      </p>

      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--bdr)", boxShadow: "var(--shadow)" }}
      >
        <h2 className="font-semibold mb-2" style={{ color: "var(--fg)" }}>Manage account security</h2>
        <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>
          Change your password, add passkeys, and configure two-factor authentication in the Keycloak account console.
        </p>
        <a
          href={keycloakAccountUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Open Account Console
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
