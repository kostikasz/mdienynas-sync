---
phase: 01-passkey-2fa
plan: 02
subsystem: web-app/auth-api
tags: [webauthn, passkey, totp, 2fa, nextauth, credentials-provider, lockout]
dependency_graph:
  requires: [passkey-prisma-models, totp-credential-model, webauthn-challenge-model, crypto-utils]
  provides: [passkey-api-routes, 2fa-verify-endpoint, mfaPending-jwt-flow]
  affects:
    - web-app/src/lib/auth.ts
    - web-app/src/types/next-auth.d.ts
    - web-app/src/app/api/auth/passkey/*
    - web-app/src/app/api/auth/2fa/verify/route.ts
tech_stack:
  added: []
  patterns: [three-case credentials provider, HMAC short-lived tokens, challenge-response WebAuthn, TOTP lockout with reset]
key_files:
  created:
    - web-app/src/lib/webauthn.ts
    - web-app/src/app/api/auth/passkey/check/route.ts
    - web-app/src/app/api/auth/passkey/register/options/route.ts
    - web-app/src/app/api/auth/passkey/register/verify/route.ts
    - web-app/src/app/api/auth/passkey/authenticate/options/route.ts
    - web-app/src/app/api/auth/passkey/authenticate/verify/route.ts
    - web-app/src/app/api/auth/passkey/list/route.ts
    - web-app/src/app/api/auth/passkey/remove/route.ts
    - web-app/src/app/api/auth/2fa/verify/route.ts
  modified:
    - web-app/src/types/next-auth.d.ts
    - web-app/src/lib/auth.ts
decisions:
  - "Three-case credentials provider dispatches on passkeyToken/mfaCompleteToken/password presence at the top of authorize() before any async work"
  - "Keycloak OTP fallback in password login path to handle users who enrolled TOTP before TotpCredential was added; they get mfaPending:true but /2fa returns 400 signaling re-enrollment needed"
  - "Shared webauthn.ts helper module holds rpId/rpName/origin constants and cleanExpiredChallenges() to avoid duplication across 4 routes"
  - "authenticate/options always returns generic options even for unknown emails to prevent user enumeration"
metrics:
  duration: "204 seconds"
  completed: "2026-04-06T14:36:21Z"
  tasks_completed: 3
  files_changed: 11
---

# Phase 1 Plan 2: Passkey API Routes + Auth.ts Token Flow Summary

Passkey WebAuthn API routes (7 routes), 2FA TOTP verify endpoint with 5-minute lockout, and NextAuth credentials provider updated to handle passkeyToken/mfaCompleteToken/password with mfaPending JWT flag flowing to session.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Update next-auth.d.ts types + auth.ts credentials provider for three-case token handling + mfaPending | 8a5e8b7 |
| 2 | Create 7 passkey API routes (check, register/options, register/verify, authenticate/options, authenticate/verify, list, remove) | f85ede0 |
| 3 | Create 2FA verify endpoint with 3-attempt lockout and mfaCompleteToken issuance | 44ee9d2 |

## What Was Built

### NextAuth Type Updates (next-auth.d.ts)

- `mfaPending: boolean` added to `Session.user` (required, not optional — always present)
- `mfaPending?: boolean` added to `User` interface
- `mfaPending?: boolean` added to `JWT` interface

### Credentials Provider (auth.ts)

Three-case dispatch at the top of `authorize()`:

**Case A — passkeyToken:** `verifyToken(token, "passkey-auth")` via HMAC. Looks up user from DB, checks TotpCredential, fetches roles from Keycloak. Returns `mfaPending: !!totpCred`.

**Case B — mfaCompleteToken:** `verifyToken(token, "mfa-complete")` via HMAC. Looks up user, fetches roles. Returns `mfaPending: false` (MFA is done).

**Case C — password:** Existing Keycloak token exchange, then checks TotpCredential in Prisma. If not found, falls back to Keycloak OTP credentials list to catch pre-migration users. Returns `mfaPending: hasMfa`.

`jwt` callback: writes `token.mfaPending` from user object.
`session` callback: writes `session.user.mfaPending` from token.

### Shared WebAuthn Helper (webauthn.ts)

Exports `rpId`, `rpName`, `origin` constants and `cleanExpiredChallenges()` (deletes expired DB rows before creating new challenges).

### Passkey API Routes

| Route | Auth | Behavior |
|-------|------|----------|
| `GET /api/auth/passkey/check` | No | Returns `{ hasPasskey: boolean }` — same response for unknown emails |
| `POST /api/auth/passkey/register/options` | Yes | Generates registration options, stores challenge |
| `POST /api/auth/passkey/register/verify` | Yes | Verifies credential, stores Passkey row |
| `POST /api/auth/passkey/authenticate/options` | No | Generates auth options (empty allowCredentials for unknown emails) |
| `POST /api/auth/passkey/authenticate/verify` | No | Verifies assertion, updates counter, returns `{ passkeyToken }` |
| `GET /api/auth/passkey/list` | Yes | Returns user's passkeys (id, name, createdAt, transports) |
| `POST /api/auth/passkey/remove` | Yes | Deletes passkey by UUID with userId ownership check |

### 2FA Verify Endpoint (api/auth/2fa/verify)

- Requires session (user has passed first factor, session has `mfaPending: true`)
- Checks `lockedUntil` before attempting TOTP verification
- 3 failed attempts: lock for 5 minutes, reset `failedAttempts` to 0, return 429
- Already locked: return 429 with `lockedUntilMs` (remaining time)
- Success: reset `failedAttempts`/`lockedUntil`, return `{ mfaCompleteToken }`
- Invalid (with attempts remaining): return 401 with `{ remaining: N }`

## Deviations from Plan

None — plan executed exactly as written. Build confirmed with `npm run build` (zero errors).

## Known Stubs

None. All routes are fully wired with real DB and crypto calls.

## Self-Check: PASSED

Files verified present:
- `/root/mdienynas-sync/web-app/src/types/next-auth.d.ts` — contains mfaPending
- `/root/mdienynas-sync/web-app/src/lib/auth.ts` — contains passkeyToken, mfaCompleteToken, mfaPending
- `/root/mdienynas-sync/web-app/src/lib/webauthn.ts` — created
- All 7 passkey route files — confirmed via ls
- `/root/mdienynas-sync/web-app/src/app/api/auth/2fa/verify/route.ts` — created
- Build: `npm run build` compiled successfully with 0 errors

Commits verified:
- 8a5e8b7 — Task 1
- f85ede0 — Task 2
- 44ee9d2 — Task 3
