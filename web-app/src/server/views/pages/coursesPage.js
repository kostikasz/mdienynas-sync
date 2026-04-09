import { renderAppShell } from "../partials/appShell.js";

export function renderCoursesPage({ rows }) {
  const items = rows
    .map(
      (row) => `
        <tr>
          <td>
            <strong>${row.name}</strong>
            <div class="admin-user__meta">${row.course_code || "No course code"}</div>
          </td>
          <td>${row.term || "—"}</td>
          <td>${row.current_grade || "—"}</td>
          <td>${row.current_percentage ?? "—"}</td>
        </tr>
      `,
    )
    .join("");

  return renderAppShell({
    title: "Courses",
    body: `
      <section class="card admin-panel">
        <div class="admin-panel__header">
          <div>
            <p class="eyebrow">Classes</p>
            <h1>Courses</h1>
            <p class="section-copy">Imported courses with the current grade summary for each class.</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Term</th>
              <th>Current grade</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>
      </section>
    `,
  });
}
