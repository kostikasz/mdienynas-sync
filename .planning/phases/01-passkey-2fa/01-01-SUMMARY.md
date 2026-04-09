---
phase: 01-passkey-2fa
plan: 01
subsystem: web-app/data-layer
tags: [prisma, webauthn, totp, crypto, aes-256-gcm, hmac]
dependency_graph:
  requires: []
  provides: [passkey-prisma-models, totp-credential-model, webauthn-challenge-model, crypto-utils]
  affects: [web-app/prisma/schema.prisma, web-app/src/lib/crypto.ts, web-app/src/app/api/settings/totp/confirm/route.ts]
tech_stack:
  added: ["@simplewebauthn/server@13.3.0", "@simplewebauthn/browser@13.3.0"]
  patterns: [AES-256-GCM encryption, HMAC-SHA256 token signing, Prisma relational models]
key_files:
  created:
    - web-app/src/lib/crypto.ts
    - web-app/prisma/migrations/20260406142700_add_passkey_totp_models/migration.sql
  modified:
    - web-app/prisma/schema.prisma
    - web-app/src/app/api/settings/totp/confirm/route.ts
    - web-app/package.json
decisions:
  - "@simplewebauthn packages installed with --legacy-peer-deps due to version conflict with @auth/core@0.41.0 (which expects v9.x, but v13.x is used directly)"
  - "Migration SQL created manually because the app-db Docker container is not reachable from the build environment; migration will be applied on next deploy"
metrics:
  duration: "208 seconds"
  completed: "2026-04-06T14:30:02Z"
  tasks_completed: 3
  files_changed: 5
---

# Phase 1 Plan 1: Data Layer — Prisma Models + Crypto Utilities Summary

Data layer foundation: Prisma models for passkeys and TOTP credentials, crypto utilities for HMAC tokens and AES-256-GCM encryption, and updated TOTP confirm route that persists encrypted secrets to both Keycloak and Prisma.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Install @simplewebauthn packages and add Passkey/TotpCredential/WebAuthnChallenge Prisma models | fc56c98 |
| 2 | Create crypto.ts with signToken/verifyToken (HMAC) and encryptSecret/decryptSecret (AES-256-GCM) | 6374aad |
| 3 | Update TOTP confirm route to upsert TotpCredential with encrypted secret after Keycloak call | e96ff64 |

## What Was Built

### Prisma Models (schema.prisma)

Three new models added:

- **Passkey**: Stores WebAuthn credential IDs (String, base64url), public keys (Bytes), counters (BigInt for anti-replay), transports (String[]), and user relation
- **TotpCredential**: Stores encrypted TOTP secrets, failed attempt counter (for lockout in Plan 02), lockedUntil timestamp, user relation (@unique userId — one TOTP per user)
- **WebAuthnChallenge**: Stores short-lived challenges with optional userId/email for authentication flow, expires_at index for cleanup

User model gains three relation fields: `passkeys`, `totpCredential`, `webAuthnChallenges`.

### Crypto Utilities (src/lib/crypto.ts)

- `signToken(userId, purpose, ttlSeconds)` — HMAC-SHA256 signed token in `base64url(payload).base64url(sig)` format; supports "passkey-auth" and "mfa-complete" purposes
- `verifyToken(token, expectedPurpose)` — timing-safe HMAC verification with purpose and expiry checks; returns `{ userId }` or null
- `encryptSecret(plaintext)` — AES-256-GCM with 12-byte random IV; stores as `iv:authTag:ciphertext` (base64 parts joined by ":")
- `decryptSecret(stored)` — reverses encryptSecret

### TOTP Confirm Route (api/settings/totp/confirm/route.ts)

Updated to persist encrypted TOTP secret to Prisma after Keycloak credential creation. Uses `upsert` so re-enrollment overwrites the previous secret. Both stores (Keycloak + Prisma) are always updated together.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm peer dependency conflict for @simplewebauthn packages**
- **Found during:** Task 1
- **Issue:** `@auth/core@0.41.0` declares optional peer dependency on `@simplewebauthn/browser@^9.0.1` and `@simplewebauthn/server@^9.0.2`, but the plan requires installing v13.x
- **Fix:** Installed with `--legacy-peer-deps` flag; v13.x is used directly by our code, not through @auth/core, so this is safe
- **Files modified:** package.json, package-lock.json
- **Commit:** fc56c98

**2. [Rule 3 - Blocking] Database not reachable from build environment**
- **Found during:** Task 1 — `npx prisma migrate dev` failed with P1001 (app-db:5432 unreachable)
- **Issue:** The PostgreSQL container runs as `app-db` in Docker network, not accessible from the host build context
- **Fix:** Wrote the migration SQL manually based on the schema diff. Migration directory follows Prisma naming convention and will be applied automatically on `prisma migrate deploy` during deployment
- **Files modified:** Created `prisma/migrations/20260406142700_add_passkey_totp_models/migration.sql`
- **Commit:** fc56c98

## Known Stubs

None. All functionality is wired: schema models defined, crypto functions implemented, TOTP confirm route persists to both Keycloak and Prisma.

## Self-Check: PASSED

Files verified:
- `/root/mdienynas-sync/web-app/prisma/schema.prisma` — contains model Passkey, model TotpCredential, model WebAuthnChallenge
- `/root/mdienynas-sync/web-app/src/lib/crypto.ts` — exports 4 functions
- `/root/mdienynas-sync/web-app/src/app/api/settings/totp/confirm/route.ts` — contains prisma.totpCredential.upsert and encryptSecret
- Build: `npm run build` compiled successfully with 0 errors
