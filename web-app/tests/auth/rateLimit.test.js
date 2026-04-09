import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryRateLimiter } from "../../src/server/lib/rateLimit.js";

test("createMemoryRateLimiter blocks after the configured limit", () => {
  const limiter = createMemoryRateLimiter({
    windowMs: 60_000,
    max: 2,
    keyFn: () => "test-key",
  });

  const responses = [];
  const makeRes = () => ({
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(message) {
      responses.push({ statusCode: this.statusCode, message });
    },
  });

  let nextCalls = 0;
  const req = { ip: "127.0.0.1" };
  const next = () => {
    nextCalls += 1;
  };

  limiter(req, makeRes(), next);
  limiter(req, makeRes(), next);
  limiter(req, makeRes(), next);

  assert.equal(nextCalls, 2);
  assert.equal(responses[0].statusCode, 429);
  assert.match(responses[0].message, /too many/i);
});
