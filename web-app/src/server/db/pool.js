import pg from "pg";
import { loadConfig } from "../config.js";

const { Pool } = pg;
let pool;

export function getPool() {
  if (!pool) {
    const config = loadConfig();
    pool = new Pool({ connectionString: config.databaseUrl });
  }

  return pool;
}
