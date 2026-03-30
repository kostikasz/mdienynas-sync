import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const NOTION_CLIENT_ID     = process.env.NOTION_CLIENT_ID     ?? ""
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET ?? ""

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code    = searchParams.get("code")
  const userId  = searchParams.get("state")
  const errParam = searchParams.get("error")

  if (errParam || !code || !userId) {
    return NextResponse.redirect(new URL("/integrations?error=notion_denied", origin))
  }

  // Exchange code for access token
  const credentials = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString("base64")
  const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
    method:  "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      grant_type:   "authorization_code",
      code,
      redirect_uri: `${origin}/api/integrations/notion/callback`,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/integrations?error=notion_token", origin))
  }

  const tokenData = await tokenRes.json()
  const accessToken  = tokenData.access_token
  const workspaceId  = tokenData.workspace_id as string | undefined
  const botId        = tokenData.bot_id as string | undefined
  const duplicatedTemplateId = tokenData.duplicated_template_id as string | undefined

  // Store token in integrations table
  const supabase = createAdminClient()
  await supabase.from("integrations").upsert({
    user_id:      userId,
    provider:     "notion",
    access_token: accessToken,
    connected_at: new Date().toISOString(),
    metadata:     {
      workspace_id:            workspaceId,
      bot_id:                  botId,
      duplicated_template_id:  duplicatedTemplateId,
      // database_id will be set by the user via UI after connecting
    },
  }, { onConflict: "user_id,provider" })

  return NextResponse.redirect(new URL("/integrations?connected=notion", origin))
}
