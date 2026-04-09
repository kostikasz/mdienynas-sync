import express from "express";
import { createImportPayload, createImportRun } from "../db/imports.js";
import { replaceCoursesForUser } from "../db/courses.js";
import { parseImportPayload } from "../lib/importParser.js";
import { renderImportPage } from "../views/pages/importPage.js";

export function createImportRouter({ requireUser } = {}) {
  const router = express.Router();
  const guard = requireUser || ((_req, _res, next) => next());

  router.use(guard);

  router.get("/import", (_req, res) => res.send(renderImportPage()));

  router.post("/import", async (req, res) => {
    const parsed = parseImportPayload(req.body.payload || "{}");
    const run = await createImportRun({
      userId: req.user?.id || "00000000-0000-0000-0000-000000000000",
      source: "manual-json",
      status: "processed",
      summary: `Imported ${parsed.courses.length} courses and ${parsed.grades.length} grades`,
    });
    await createImportPayload({
      importRunId: run.id,
      payload: parsed.payload,
    });
    await replaceCoursesForUser({
      userId: req.user?.id || "00000000-0000-0000-0000-000000000000",
      courses: parsed.courses,
    });
    res.redirect("/dashboard?message=imported");
  });

  return router;
}
