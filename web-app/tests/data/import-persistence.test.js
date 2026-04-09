import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

function makeFakePool() {
  const store = { courses: [], grades: [] };

  return {
    store,
    async query(sql, params = []) {
      const normalized = String(sql).replace(/\s+/g, " ").trim().toLowerCase();

      if (normalized.startsWith("delete from grades where user_id = $1")) {
        const [userId] = params;
        store.grades = store.grades.filter((row) => row.user_id !== userId);
        return { rows: [] };
      }

      if (normalized.startsWith("delete from courses where user_id = $1")) {
        const [userId] = params;
        store.courses = store.courses.filter((row) => row.user_id !== userId);
        store.grades = store.grades.filter((row) => row.user_id !== userId);
        return { rows: [] };
      }

      if (normalized.startsWith("insert into courses")) {
        const [userId, courseCode, name, instructor, credits, term, currentGrade, currentPercentage] = params;
        const row = {
          id: randomUUID(),
          user_id: userId,
          course_code: courseCode,
          name,
          instructor,
          credits,
          term,
          current_grade: currentGrade,
          current_percentage: currentPercentage,
        };
        store.courses.push(row);
        return { rows: [row] };
      }

      if (normalized.startsWith("insert into grades")) {
        const [userId, courseId, title, gradeValue, gradeType, weight, recordedAt] = params;
        const row = {
          id: randomUUID(),
          user_id: userId,
          course_id: courseId,
          title,
          grade_value: gradeValue,
          grade_type: gradeType,
          weight,
          recorded_at: recordedAt,
        };
        store.grades.push(row);
        return { rows: [row] };
      }

      return { rows: [] };
    },
  };
}

test("replaceCoursesForUser replaces the user courses and grades", async () => {
  const pg = await import("pg");
  const fakePool = makeFakePool();
  pg.default.Pool = class FakePool {
    query(sql, params) {
      return fakePool.query(sql, params);
    }
  };

  const { replaceCoursesForUser } = await import("../../src/server/db/courses.js");

  const userId = randomUUID();
  await replaceCoursesForUser({
    userId,
    courses: [
      {
        courseCode: "MATH-101",
        name: "Math",
        instructor: "Dr. Ada",
        credits: 5,
        term: "Fall",
        currentGrade: "A",
        currentPercentage: 95,
        grades: [{ title: "Quiz", gradeValue: "10", gradeType: "exam", weight: 20 }],
      },
    ],
  });

  assert.equal(fakePool.store.courses.length, 1);
  assert.equal(fakePool.store.grades.length, 1);

  await replaceCoursesForUser({
    userId,
    courses: [
      {
        name: "Physics",
        grades: [],
      },
    ],
  });

  assert.equal(fakePool.store.courses.length, 1);
  assert.equal(fakePool.store.grades.length, 0);
  assert.equal(fakePool.store.courses[0].name, "Physics");
});
