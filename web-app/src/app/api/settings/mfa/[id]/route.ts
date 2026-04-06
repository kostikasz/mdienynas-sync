import { auth } from "@/lib/auth"
import { deleteCredential } from "@/lib/keycloak/admin"
import { NextResponse } from "next/server"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await deleteCredential(session.user.id, id)
  return NextResponse.json({ ok: true })
}
