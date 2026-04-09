import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("schema defines core phase-1 tables", () => {
  const sql = fs.readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8");

  for (const table of [
    "users",
    "sessions",
    "email_verification_tokens",
    "password_reset_tokens",
    "one_time_login_tokens",
    "courses",
    "grades",
    "import_runs",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists ${table}`, "i"));
  }
});
