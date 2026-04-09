import express from "express";
import { registerRoutes } from "./routes/index.js";

export async function buildApp(options = {}) {
  const app = express();

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use("/assets", express.static(new URL("./public/", import.meta.url).pathname));

  registerRoutes(app, options);

  return { app, handler: app };
}
