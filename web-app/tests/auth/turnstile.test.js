import test from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstile } from "../../src/server/lib/turnstile.js";

test("verifyTurnstile skips verification in local development without a secret", async () => {
  const result = await verifyTurnstile({
    token: "test-token",
    env: { NODE_ENV: "development", TURNSTILE_SECRET_KEY: "" },
    fetchImpl: async () => {
      throw new Error("should not call fetch");
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.skipped, true);
});
