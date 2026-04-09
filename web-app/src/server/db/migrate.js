import fs from "node:fs/promises";
import { getPool } from "./pool.js";

const schemaPath = new URL("../../../db/schema.sql", import.meta.url);
const sql = await fs.readFile(schemaPath, "utf8");

await getPool().query(sql);

console.log("schema applied");
