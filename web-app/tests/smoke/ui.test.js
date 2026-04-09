import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("css preserves the evergreen palette tokens", () => {
  const css = fs.readFileSync(new URL("../../src/server/public/app.css", import.meta.url), "utf8");

  for (const token of ["--bg", "--surface", "--fg", "--accent", "--sidebar", "--input-bg"]) {
    assert.match(css, new RegExp(token.replace(/[-]/g, "\\$&")));
  }
});
