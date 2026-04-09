import test from "node:test";
import assert from "node:assert/strict";
import { parseImportPayload } from "../../src/server/lib/importParser.js";

test("parseImportPayload extracts courses and grades from pasted JSON", () => {
  const parsed = parseImportPayload(
    JSON.stringify({
      courses: [{ name: "Math", grades: [{ title: "Quiz", value: "10" }] }],
    }),
  );

  assert.equal(parsed.courses.length, 1);
  assert.equal(parsed.grades.length, 1);
});
