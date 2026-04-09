import { NextResponse } from "next/server"
import { createUser } from "@/lib/keycloak/admin"
import { verifyTurnstile } from "@/lib/turnstile"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const { email, password, turnstileToken } = body

  if (!email || !password || !turnstileToken) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
  }

  const captchaOk = await verifyTurnstile(turnstileToken)
  if (!captchaOk) {
    return NextResponse.json({ error: "Security check failed." }, { status: 400 })
  }

  try {
    await createUser(email, password)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : ""
    const msg = raw.toLowerCase().includes("exists")
      ? "An account with this email already exists."
      : "Registration failed. Please try again."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
