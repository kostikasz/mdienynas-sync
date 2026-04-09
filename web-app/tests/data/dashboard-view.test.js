import test from "node:test";
import assert from "node:assert/strict";
import { renderDashboardPage } from "../../src/server/views/pages/dashboardPage.js";

test("renderDashboardPage shows the course and grade counts", () => {
  const html = renderDashboardPage({
    summary: { courseCount: 2, gradeCount: 5 },
  });

  for (const text of [
    "Course overview",
    "Active courses",
    "Recent grades",
    "A compact view of your imported grades and active courses.",
  ]) {
    assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(html, /<strong>2<\/strong>/);
  assert.match(html, /<strong>5<\/strong>/);
});
