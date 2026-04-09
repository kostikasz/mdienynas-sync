import test from "node:test";
import assert from "node:assert/strict";
import { createAuthRouter } from "../../src/server/routes/authRoutes.js";

test("createAuthRouter returns a router with auth endpoints", () => {
  const router = createAuthRouter({
    users: {},
    sessions: {},
    mailer: {},
  });

  assert.ok(router);
  assert.ok(Array.isArray(router.stack));
});
