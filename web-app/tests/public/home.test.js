import test from "node:test";
import assert from "node:assert/strict";
import { renderHomePage } from "../../src/server/views/pages/homePage.js";

test("renderHomePage preserves the full marketing homepage content", () => {
  const html = renderHomePage();

  for (const text of [
    "For Mano Dienynas students",
    "Your grades,",
    "always in sync.",
    "A clean, fast dashboard for your courses",
    "What you get",
    "How it works",
    "Simple pricing",
    "Ready to get started?",
  ]) {
    assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
