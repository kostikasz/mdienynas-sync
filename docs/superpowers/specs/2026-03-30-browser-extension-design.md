# Browser Extension Design

**Date:** 2026-03-30
**Status:** Approved
**Scope:** Chrome/Chromium MV3 extension that scrapes Mano Dienynas from the user's browser and uploads to the web app

---

## Problem

Running a central cloud scraper would expose all users to a shared IP that Mano Dienynas could flag as a bot. The fix: scraping happens in the user's own browser, using their existing session cookies. Their IP reaches the portal, not a datacenter's.

---

## Architecture

```
Popup "Sync" click
  → message → background service worker
  → fetch manodienynas.lt/grades + /homework  (session cookies auto-included via host_permissions)
  → parse HTML with DOMParser
  → POST /api/grades + POST /api/homework  (Authorization: Bearer <supabase_jwt>)
  → respond to popup → show result
```

The extension lives at `browser-extension/` in the monorepo root, alongside `web-app/` and `scraper/`.

---

## File Structure

```
browser-extension/
├── manifest.json              ← MV3, host_permissions for manodienynas.lt + web app domain
├── build.js                   ← esbuild script (bundles src/ → dist/)
├── package.json
├── tsconfig.json
├── src/
│   ├── background.ts          ← service worker: orchestrates fetch → parse → upload
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts           ← DOM manipulation for 3 UI states
│   │   └── popup.css          ← green theme matching web app CSS variables
│   └── lib/
│       ├── parser.ts          ← port of scraper/parser.py (DOMParser-based)
│       ├── exporter.ts        ← port of scraper/exporter.py (builds grades/homework JSON)
│       ├── auth.ts            ← Supabase sign-in, token refresh, chrome.storage.local
│       └── api.ts             ← POST to /api/grades and /api/homework with Bearer JWT
├── icons/
│   ├── 16.png
│   ├── 48.png
│   └── 128.png
└── dist/                      ← build output (gitignored), loaded in Chrome as unpacked extension
```

---

## Auth Flow

### Login
1. Popup shows email + password fields (State 1)
2. On submit → `auth.ts` calls `POST <SUPABASE_URL>/auth/v1/token?grant_type=password` with the public anon key
3. On success → stores `{ access_token, refresh_token, expires_at, email }` in `chrome.storage.local`
4. Popup switches to State 2 (logged in)

### Token refresh
- On every sync attempt, `auth.ts` checks `expires_at`
- If within 60 seconds of expiry → calls `POST /auth/v1/token?grant_type=refresh_token` silently before proceeding

### Logout
- Clears `chrome.storage.local`
- Calls `POST /auth/v1/logout` to invalidate server-side

### Hardcoded public constants (in `src/lib/auth.ts`)
```ts
const SUPABASE_URL = "https://your-project.supabase.co"
const SUPABASE_ANON_KEY = "eyJ..."
const WEBAPP_URL = "https://your-app.vercel.app"
```
Both values are already public (embedded in the Next.js client bundle). No `.env` needed in the extension.

---

## Popup UI States

### State 1 — Logged out
- Email + password fields
- Sign in button
- Error: "Wrong email or password." (only on failed attempt)

### State 2 — Logged in (idle)
- "Signed in as user@example.com" + Log out link
- "Last synced: X ago" or "Never synced"
- Sync now button

### State 3 — Syncing / result
- Same header as State 2
- Status line: "⟳ Syncing..." → "✓ Synced — 6 courses, 12 homework entries" or "✗ \<error message\>"
- Sync now button (disabled during sync)

**Dimensions:** 320×280px fixed. Styled with the web app's green CSS variable palette.

---

## Parser (`src/lib/parser.ts`)

Direct port of `scraper/parser.py` using `DOMParser` instead of BeautifulSoup. Selectors are identical.

```ts
export function parseGrades(html: string): GradeEntry[]
// querySelectorAll("td.mark_subject") → group_id → subject/teacher map
// querySelectorAll("td.td-class-mark") → extract grade values
// Returns same shape as Python parse_grades()

export function parseHomework(html: string): HomeworkEntry[]
// querySelectorAll("tr.simple_info_block") → extract all columns
// Returns same shape as Python parse_homework()
```

**Portal URLs** (hardcoded in `background.ts`):
- Grades: `https://www.manodienynas.lt/1/lt/page/marks_pupil/marks`
- Homework: `https://www.manodienynas.lt/1/lt/page/classhomework/home_work`

**Not-logged-in detection:** if either response HTML contains `#dl_username`, sync fails with:
> "Not logged in to Mano Dienynas — please open the portal and log in first."

---

## Web App Changes

### New file: `src/lib/supabase/bearerClient.ts`
~15 lines. Tries cookie auth first; if no session found, reads `Authorization: Bearer <jwt>` header and initialises a Supabase client with that token.

```ts
export async function getAuthenticatedUser(req: NextRequest): Promise<User | null>
```

### Modified routes
- `POST /api/grades` — replaces inline auth block with `getAuthenticatedUser(req)`
- `POST /api/homework` — same

No other changes to these routes. All existing validation and normalization logic is preserved.

---

## manifest.json permissions

```json
{
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": [
    "https://www.manodienynas.lt/*",
    "https://*.supabase.co/*",
    "https://your-app.vercel.app/*"
  ]
}
```

`storage` — for `chrome.storage.local` (JWT storage).
No `cookies`, `tabs`, or `activeTab` needed — background fetch with `host_permissions` is sufficient.

---

## Error States

| Condition | User-facing message |
|-----------|-------------------|
| Not logged in to portal | "Not logged in to Mano Dienynas — please open the portal and log in first." |
| Portal fetch fails (network) | "Could not reach Mano Dienynas. Check your connection." |
| Web app upload fails | "Sync failed — could not save data. Try again." |
| Supabase login fails | "Wrong email or password." |
| Token refresh fails | Clears stored session, returns to State 1 |

---

## Out of Scope (v1)

- Firefox support
- Auto-sync on portal visit
- Extension options/settings page
- Packaging for Chrome Web Store (load unpacked for now)
