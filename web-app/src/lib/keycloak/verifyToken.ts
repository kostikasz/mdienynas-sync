import { createRemoteJWKSet, jwtVerify } from "jose"
import type { JWTPayload, RemoteJWKSet } from "jose"

let _jwks: RemoteJWKSet | null = null

function getJWKS(): RemoteJWKSet {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(
      new URL(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`)
    )
  }
  return _jwks
}

export async function verifyKeycloakToken(jwt: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(jwt, getJWKS(), {
    issuer:   process.env.KEYCLOAK_ISSUER,
    audience: "account",
  })
  return payload
}
