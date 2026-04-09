import express from "express";
import { listCoursesForUser, listGradesForUser, summarizeDashboard } from "../db/courses.js";
import { renderDashboardPage } from "../views/pages/dashboardPage.js";
import { renderCoursesPage } from "../views/pages/coursesPage.js";

export function createAppRouter({ requireUser } = {}) {
  const router = express.Router();
  const guard = requireUser || ((_req, _res, next) => next());

  router.use(guard);

  router.get("/dashboard", async (req, res) => {
    const userId = req.user?.id || "00000000-0000-0000-0000-000000000000";
    const courses = await listCoursesForUser(userId);
    const grades = await listGradesForUser(userId);
    res.send(renderDashboardPage({ summary: summarizeDashboard({ courses, grades }) }));
  });

  router.get("/courses", async (req, res) => {
    const rows = await listCoursesForUser(req.user?.id || "00000000-0000-0000-0000-000000000000");
    res.send(renderCoursesPage({ rows }));
  });

  return router;
}
