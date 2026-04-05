import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const NOTION_CLIENT_ID     = process.env.NOTION_CLIENT_ID     ?? ""
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET ?? ""

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code     = searchParams.get("code")
  const userId   = searchParams.get("state")
  const errParam = searchParams.get("error")

  if (errParam || !code || !userId) {
    return NextResponse.redirect(new URL("/integrations?error=notion_denied", origin))
  }

  const session = await auth()
  if (!session || session.user.id !== userId) {
    return NextResponse.redirect(new URL("/integrations?error=notion_unauthorized", origin))
  }

  const credentials = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString("base64")
  const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
    method:  "POST",
    headers: { "Authorization": `Basic ${credentials}`, "Content-Type": "application/json" },
    body:    JSON.stringify({
      grant_type:   "authorization_code",
      code,
      redirect_uri: `${origin}/api/integrations/notion/callback`,
    }),
  })

  if (!tokenRes.ok) return NextResponse.redirect(new URL("/integrations?error=notion_token", origin))

  const tokenData            = await tokenRes.json()
  const accessToken          = tokenData.access_token          as string
  const workspaceId          = tokenData.workspace_id          as string | undefined
  const botId                = tokenData.bot_id                as string | undefined
  const duplicatedTemplateId = tokenData.duplicated_template_id as string | undefined

  await prisma.integration.upsert({
    where:  { userId_provider: { userId, provider: "notion" } },
    update: { accessToken, connectedAt: new Date(), metadata: { workspace_id: workspaceId, bot_id: botId, duplicated_template_id: duplicatedTemplateId } },
    create: { userId, provider: "notion", accessToken, connectedAt: new Date(), metadata: { workspace_id: workspaceId, bot_id: botId, duplicated_template_id: duplicatedTemplateId } },
  })

  return NextResponse.redirect(new URL("/integrations?connected=notion", origin))
}
