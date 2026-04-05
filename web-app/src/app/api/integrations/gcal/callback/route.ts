import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ""
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code     = searchParams.get("code")
  const userId   = searchParams.get("state")
  const errParam = searchParams.get("error")

  if (errParam || !code || !userId) {
    return NextResponse.redirect(new URL("/integrations?error=gcal_denied", origin))
  }

  const session = await auth()
  if (!session || session.user.id !== userId) {
    return NextResponse.redirect(new URL("/integrations?error=gcal_unauthorized", origin))
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  `${origin}/api/integrations/gcal/callback`,
      grant_type:    "authorization_code",
    }),
  })

  if (!tokenRes.ok) return NextResponse.redirect(new URL("/integrations?error=gcal_token", origin))

  const tokens = await tokenRes.json()

  await prisma.integration.upsert({
    where:  { userId_provider: { userId, provider: "google_calendar" } },
    update: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? null, connectedAt: new Date(), metadata: { calendar_id: "primary" } },
    create: { userId, provider: "google_calendar", accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? null, connectedAt: new Date(), metadata: { calendar_id: "primary" } },
  })

  return NextResponse.redirect(new URL("/integrations?connected=gcal", origin))
}
