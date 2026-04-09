import { getPool } from "./pool.js";

export function summarizeDashboard({ courses, grades }) {
  return {
    courseCount: courses.length,
    gradeCount: grades.length,
  };
}

export async function listCoursesForUser(userId) {
  const result = await getPool().query(
    "select * from courses where user_id = $1 order by name asc",
    [userId],
  );

  return result.rows;
}

export async function listGradesForUser(userId) {
  const result = await getPool().query(
    "select * from grades where user_id = $1 order by created_at desc",
    [userId],
  );

  return result.rows;
}

export async function replaceCoursesForUser({ userId, courses }) {
  const pool = getPool();
  await pool.query("begin");

  try {
    await pool.query("delete from courses where user_id = $1", [userId]);

    for (const course of courses) {
      const courseResult = await pool.query(
        `insert into courses
         (user_id, course_code, name, instructor, credits, term, current_grade, current_percentage)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning *`,
        [
          userId,
          course.courseCode || null,
          course.name,
          course.instructor || null,
          course.credits ?? null,
          course.term || null,
          course.currentGrade || null,
          course.currentPercentage ?? null,
        ],
      );

      const insertedCourse = courseResult.rows[0];

      for (const grade of course.grades || []) {
        await pool.query(
          `insert into grades
           (user_id, course_id, title, grade_value, grade_type, weight, recorded_at)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            insertedCourse.id,
            grade.title,
            grade.gradeValue,
            grade.gradeType || null,
            grade.weight ?? null,
            grade.recordedAt || null,
          ],
        );
      }
    }

    await pool.query("commit");
  } catch (error) {
    await pool.query("rollback");
    throw error;
  }
}
