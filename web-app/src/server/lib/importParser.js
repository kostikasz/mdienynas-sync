export function parseImportPayload(rawText) {
  const payload = JSON.parse(rawText);
  const courses = [];
  const grades = [];

  for (const course of payload.courses || []) {
    const normalizedCourse = {
      name: course.name,
      courseCode: course.courseCode || null,
      instructor: course.instructor || null,
      credits: course.credits ?? null,
      term: course.term || null,
      currentGrade: course.currentGrade || null,
      currentPercentage: course.currentPercentage ?? null,
      grades: [],
    };

    for (const grade of course.grades || []) {
      const normalizedGrade = {
        title: grade.title,
        gradeValue: grade.value,
        gradeType: grade.type || null,
        weight: grade.weight ?? null,
        recordedAt: grade.recordedAt || null,
      };

      normalizedCourse.grades.push(normalizedGrade);

      grades.push({
        courseName: course.name,
        ...normalizedGrade,
      });
    }

    courses.push(normalizedCourse);
  }

  return { payload, courses, grades };
}
