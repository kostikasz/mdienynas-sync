import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../../src/server/app.js";

test("buildApp returns an object with a request handler", async () => {
  const app = await buildApp({ testMode: true });
  assert.equal(typeof app.handler, "function");
});
