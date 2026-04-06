import { auth } from "@/lib/auth"
import { generateSecret, otpauthUri } from "@/lib/totp"
import { NextResponse } from "next/server"
import QRCode from "qrcode"

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const secret = generateSecret()
  const uri    = otpauthUri(secret, session.user.email!, "DienynasSync")
  const svg    = await QRCode.toString(uri, { type: "svg", margin: 1 })

  return NextResponse.json({ secret, svg })
}
