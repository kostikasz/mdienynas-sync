import { NextRequest, NextResponse } from "next/server"
import { verifyTurnstile } from "@/lib/turnstile"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { token } = body

  if (!token || typeof token !== "string") {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  const success = await verifyTurnstile(token)
  return NextResponse.json({ success })
}
