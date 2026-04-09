import { renderAppShell } from "../partials/appShell.js";

export function renderDashboardPage({ summary }) {
  return renderAppShell({
    title: "Dashboard",
    body: `
      <section class="card dashboard-panel">
        <div>
          <p class="eyebrow">Overview</p>
          <h1>Course overview</h1>
          <p class="section-copy">A compact view of your imported grades and active courses.</p>
        </div>
        <div class="dashboard-metrics">
          <article class="metric-card">
            <strong>${summary.courseCount}</strong>
            <span>Active courses</span>
          </article>
          <article class="metric-card">
            <strong>${summary.gradeCount}</strong>
            <span>Recent grades</span>
          </article>
        </div>
      </section>
    `,
  });
}
