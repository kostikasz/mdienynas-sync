# Roadmap: mdienynas-sync

## Overview

Add passkey (WebAuthn) primary authentication and TOTP 2FA to the existing Keycloak + NextAuth setup.
Passkeys let users skip the password on login; TOTP gates access after any first factor when enabled.

## Phases

- [ ] **Phase 1: Passkey Primary Auth + TOTP 2FA** - WebAuthn passkeys as primary login, TOTP as optional second factor with lockout

## Phase Details

### Phase 1: Passkey Primary Auth + TOTP 2FA
**Goal**: Users can register and use passkeys to skip password on login. Users with TOTP enabled are redirected to /2fa after any successful first factor (password or passkey). Three bad TOTP codes triggers a 5-minute lockout.
**Depends on**: Nothing (existing Keycloak + NextAuth + Prisma stack)
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05
**Success Criteria** (what must be TRUE):
  1. User can log in with a passkey without entering a password
  2. User with TOTP enabled is redirected to /2fa after login (password or passkey)
  3. Three invalid TOTP codes locks the user out for 5 minutes with a visible countdown
  4. Valid TOTP code redirects to /dashboard with a full session
  5. No plain-text passwords flow through the passkey sign-in path
**Plans**: 3 plans

Plans:
- [x] 01-01: Data layer — Prisma models (Passkey, TotpCredential) + migration + TOTP confirm route update
- [ ] 01-02: Passkey API routes + auth.ts token flow (passkeyToken, mfaCompleteToken, mfaPending JWT)
- [ ] 01-03: UI — login page passkey button + /2fa page + middleware guard

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Passkey Primary Auth + TOTP 2FA | 1/3 | In Progress|  |
