const ISSUER        = process.env.KEYCLOAK_ISSUER!
const CLIENT_ID     = "mdienynas-admin"
const CLIENT_SECRET = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET!

function adminBase(): string {
  return ISSUER.replace("/realms/", "/admin/realms/")
}

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${ISSUER}/protocol/openid-connect/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })
  if (!res.ok) throw new Error(`Failed to get admin token: ${res.status}`)
  const data = await res.json()
  return data.access_token as string
}

export interface KcUser {
  id:               string
  email:            string
  username:         string
  enabled:          boolean
  createdTimestamp: number
}

export async function listUsers(max = 1000): Promise<KcUser[]> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users?max=${max}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`listUsers failed: ${res.status}`)
  return res.json()
}

export async function createUser(email: string, password: string): Promise<{ id: string; email: string }> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify({
      email,
      username:    email,
      enabled:     true,
      credentials: [{ type: "password", value: password, temporary: false }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err)
  }
  const location = res.headers.get("location") ?? ""
  const id       = location.split("/").pop() ?? ""
  return { id, email }
}

export async function deleteUser(id: string): Promise<void> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users/${id}`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`deleteUser failed: ${res.status}`)
}

export async function disableUser(id: string): Promise<void> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users/${id}`, {
    method:  "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ enabled: false }),
  })
  if (!res.ok) throw new Error(`disableUser failed: ${res.status}`)
}

export async function enableUser(id: string): Promise<void> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users/${id}`, {
    method:  "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ enabled: true }),
  })
  if (!res.ok) throw new Error(`enableUser failed: ${res.status}`)
}

async function getRoleRepresentation(token: string, role: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${adminBase()}/roles/${role}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Role ${role} not found: ${res.status}`)
  return res.json()
}

export async function getUserRealmRoles(userId: string): Promise<string[]> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users/${userId}/role-mappings/realm`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const roles = await res.json()
  return (roles as Array<{ name: string }>).map((r) => r.name)
}

export async function assignRealmRole(userId: string, role: string): Promise<void> {
  const token   = await getAdminToken()
  const roleRep = await getRoleRepresentation(token, role)
  const res     = await fetch(`${adminBase()}/users/${userId}/role-mappings/realm`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify([roleRep]),
  })
  if (!res.ok) throw new Error(`assignRealmRole failed: ${res.status}`)
}

export async function removeRealmRole(userId: string, role: string): Promise<void> {
  const token   = await getAdminToken()
  const roleRep = await getRoleRepresentation(token, role)
  const res     = await fetch(`${adminBase()}/users/${userId}/role-mappings/realm`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify([roleRep]),
  })
  if (!res.ok) throw new Error(`removeRealmRole failed: ${res.status}`)
}

// ─── Credentials ──────────────────────────────────────────────────────────────

export interface KcCredential {
  id:          string
  type:        string
  userLabel:   string | null
  createdDate: number
}

export async function listCredentials(userId: string): Promise<KcCredential[]> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users/${userId}/credentials`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`listCredentials failed: ${res.status}`)
  return res.json()
}

export async function deleteCredential(userId: string, credentialId: string): Promise<void> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users/${userId}/credentials/${credentialId}`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`deleteCredential failed: ${res.status}`)
}

export async function createOtpCredential(
  userId: string,
  secret: string,
  label:  string,
): Promise<void> {
  const token   = await getAdminToken()
  const secretData = JSON.stringify({
    value:                secret,
    digits:               6,
    counterLookAheadWindow: 1,
    period:               30,
    algorithm:            "HmacSHA1",
  })
  const credentialData = JSON.stringify({
    subType:   "totp",
    digits:    6,
    period:    30,
    algorithm: "HmacSHA1",
    otpType:   "totp",
  })
  const res = await fetch(`${adminBase()}/users/${userId}/credentials`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ type: "otp", userLabel: label, secretData, credentialData }),
  })
  if (!res.ok) throw new Error(`createOtpCredential failed: ${res.status}`)
}

export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users/${userId}/reset-password`, {
    method:  "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ type: "password", value: newPassword, temporary: false }),
  })
  if (!res.ok) throw new Error(`resetPassword failed: ${res.status}`)
}

// ─── Federated identities ──────────────────────────────────────────────────────

export interface KcFederatedIdentity {
  identityProvider: string
  userId:           string
  userName:         string
}

export async function listFederatedIdentities(userId: string): Promise<KcFederatedIdentity[]> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users/${userId}/federated-identity`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  return res.json()
}

export async function removeFederatedIdentity(userId: string, provider: string): Promise<void> {
  const token = await getAdminToken()
  const res   = await fetch(`${adminBase()}/users/${userId}/federated-identity/${provider}`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`removeFederatedIdentity failed: ${res.status}`)
}
