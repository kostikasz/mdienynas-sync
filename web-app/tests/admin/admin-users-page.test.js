import test from "node:test";
import assert from "node:assert/strict";
import { renderAdminUsersPage } from "../../src/server/views/pages/adminUsersPage.js";

test("renderAdminUsersPage shows clear user status and email actions", () => {
  const html = renderAdminUsersPage({
    rows: [
      {
        id: "user-1",
        email: "admin@example.com",
        is_confirmed: true,
        confirmed_at: "2026-04-09 12:00",
        created_at: "2026-04-08 09:00",
        latest_session_at: "2026-04-09 12:30",
      },
      {
        id: "user-2",
        email: "guest@example.com",
        is_confirmed: false,
        confirmed_at: null,
        created_at: "2026-04-08 10:00",
        latest_session_at: null,
      },
    ],
  });

  for (const text of [
    "User management",
    "Confirmation status",
    "Email actions",
    "Create login link",
    "Resend confirmation",
    "Send test email",
    "Confirmed",
    "Pending",
    "Revoke confirmation",
    "Confirm account",
  ]) {
    assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(html, /status-badge--confirmed/);
  assert.match(html, /status-badge--pending/);
});
