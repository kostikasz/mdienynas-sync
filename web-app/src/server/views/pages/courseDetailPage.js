import { renderAppShell } from "../partials/appShell.js";

export function renderCourseDetailPage({ course, grades }) {
  const gradeRows = grades.map((grade) => `<li>${grade.title}: ${grade.grade_value}</li>`).join("");

  return renderAppShell({
    title: course.name,
    body: `
      <section class="card" style="padding:24px;">
        <p>${course.course_code || ""}</p>
        <ul>${gradeRows}</ul>
      </section>
    `,
  });
}
