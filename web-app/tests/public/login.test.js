import test from "node:test";
import assert from "node:assert/strict";
import { renderLoginPage } from "../../src/server/views/pages/loginPage.js";

test("renderLoginPage preserves the old login layout and copy", () => {
  const html = renderLoginPage();

  for (const text of [
    "Welcome back",
    "Sign in to your account",
    "Continue with Google",
    "Continue with Discord",
    "Email",
    "Password",
  ]) {
    assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(html, /Wrong email or password\./);
  assert.doesNotMatch(html, /Security check/);
  assert.doesNotMatch(html, /cf-turnstile/);
  assert.doesNotMatch(html, /passkey/i);
});

test("renderLoginPage shows an error message only when one is provided", () => {
  const html = renderLoginPage({ errorMessage: "Wrong email or password." });

  assert.match(html, /Wrong email or password\./);
  assert.match(html, /role="alert"/);
});
