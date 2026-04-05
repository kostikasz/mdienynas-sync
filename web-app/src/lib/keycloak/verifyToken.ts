import { createRemoteJWKSet, jwtVerify } from "jose"
import type { JWTPayload } from "jose"

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`)
)

export async function verifyKeycloakToken(jwt: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(jwt, JWKS, {
    issuer:   process.env.KEYCLOAK_ISSUER,
    audience: "account",
  })
  return payload
}
