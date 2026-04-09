import "dotenv/config";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const { app } = await buildApp();

app.listen(config.port, () => {
  console.log(`web-app listening on ${config.port}`);
});
