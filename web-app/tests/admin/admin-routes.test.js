import test from "node:test";
import assert from "node:assert/strict";
import { createAdminRouter } from "../../src/server/routes/adminRoutes.js";
import { isAdminEmail } from "../../src/server/lib/auth.js";

test("isAdminEmail matches the configured admin address", () => {
  assert.equal(
    isAdminEmail("Admin@Example.com", { adminEmail: "admin@example.com" }),
    true,
  );
  assert.equal(isAdminEmail("user@example.com", { adminEmail: "admin@example.com" }), false);
});

test("createAdminRouter returns a router", () => {
  const router = createAdminRouter({
    requireAdmin: (_req, _res, next) => next(),
  });

  assert.ok(router);
  assert.ok(Array.isArray(router.stack));
});
