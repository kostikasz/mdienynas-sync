import { createRemoteJWKSet, jwtVerify } from "jose"
import type { JWTPayload } from "jose"

type JWKS = ReturnType<typeof createRemoteJWKSet>

let _jwks: JWKS | null = null

function getJWKS(): JWKS {
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
