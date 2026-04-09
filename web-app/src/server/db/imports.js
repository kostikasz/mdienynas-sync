import { getPool } from "./pool.js";

export async function createImportRun({ userId, source, status, summary }) {
  const result = await getPool().query(
    "insert into import_runs (user_id, source, status, summary) values ($1, $2, $3, $4) returning *",
    [userId, source, status, summary],
  );

  return result.rows[0];
}

export async function createImportPayload({ importRunId, payload }) {
  const result = await getPool().query(
    "insert into import_payloads (import_run_id, payload_json) values ($1, $2::jsonb) returning *",
    [importRunId, JSON.stringify(payload)],
  );

  return result.rows[0];
}
