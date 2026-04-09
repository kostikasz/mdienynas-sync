Small server-rendered Node.js application for Dienynas Sync.

## Environment

Copy `web-app/.env.example` to `.env` or `.env.local` and fill in the values.
See [docs/environment-secrets.md](/root/mdienynas-sync/docs/environment-secrets.md) for reusable secret-generation guidance.

- Use `openssl rand -base64 32` for `SESSION_SECRET` and any other long-lived secret.
- `TURNSTILE_SITE_KEY` is public. `TURNSTILE_SECRET_KEY` is private.
- If you still have `NEXT_PUBLIC_TURNSTILE_SITE_KEY` from the old app, the new app accepts it too. Prefer `TURNSTILE_SITE_KEY` going forward.
- SMTP for confirmation/reset emails is expected to use AWS SES.
- `SMTP_HOST` should look like `email-smtp.us-east-1.amazonaws.com`.
- `SMTP_USER` and `SMTP_PASS` are the SES SMTP credentials you generate in AWS.
- `ADMIN_EMAIL` is not secret, but it must match the inbox that should get admin access.

## Scripts

- `npm run dev`
- `npm run start`
- `npm run test`
- `npm run check`
