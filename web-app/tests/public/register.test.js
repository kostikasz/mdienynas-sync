import test from "node:test";
import assert from "node:assert/strict";
import { renderRegisterPage } from "../../src/server/views/pages/registerPage.js";

test("renderRegisterPage preserves the old registration layout and copy", () => {
  const html = renderRegisterPage();

  for (const text of [
    "Create account",
    "Start tracking your grades for free",
    "Continue with Google",
    "Continue with Discord",
    "Email",
    "Password",
    "Create account",
    "Already have an account?",
  ]) {
    assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(html, /Security check/);
  assert.doesNotMatch(html, /cf-turnstile/);
});
