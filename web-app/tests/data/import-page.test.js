import test from "node:test";
import assert from "node:assert/strict";
import { renderImportPage } from "../../src/server/views/pages/importPage.js";

test("renderImportPage guides the user through a manual JSON import", () => {
  const html = renderImportPage();

  for (const text of [
    "Manual import",
    "Paste JSON payload",
    "Example payload",
    "Import",
  ]) {
    assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(html, /placeholder="Paste exported course\/grade JSON here"/);
});
