export interface GradeEntry {
  type: "Grade"
  subject: string
  content: string
  due_date: string | null
  lesson_id: string
  grade: string
  teacher: string
}

export interface HomeworkEntry {
  subject: string
  lesson_id: string | null
  description: string | null
  assigned_date: string | null
  due_date: string | null
  teacher: string | null
  homework_url: string | null
}

export interface Assignment {
  id: string | null
  name: string
  category: string
  score: string
  max_score: number | null
  date: string | null
  lesson_id: string
  status: "graded"
}

export interface Course {
  id: string
  name: string
  instructor: null
  credits: null
  current_grade: null
  current_percentage: null
  assignments: Assignment[]
  categories: never[]
}

export interface GradesJson {
  metadata: {
    student_name: string | null
    student_id: null
    institution: string
    scraped_at: string
    term: string | null
  }
  courses: Course[]
}

export interface HomeworkItem {
  id: string
  subject: string
  lesson_id: string | null
  teacher: string | null
  description: string | null
  assigned_date: string | null
  due_date: string | null
  homework_url: string | null
}

export interface HomeworkJson {
  generated_at: string
  source: "extension"
  count: number
  homework: HomeworkItem[]
}
