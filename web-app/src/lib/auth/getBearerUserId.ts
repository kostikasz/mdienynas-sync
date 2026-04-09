import { NextRequest } from "next/server"
import { verifyKeycloakToken } from "@/lib/keycloak/verifyToken"

export async function getBearerUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  const jwt = authHeader.slice(7)
  try {
    const payload = await verifyKeycloakToken(jwt)
    return typeof payload.sub === "string" ? payload.sub : null
  } catch {
    return null
  }
}
