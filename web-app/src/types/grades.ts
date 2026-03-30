export interface GradeMetadata {
  student_name: string | null
  student_id: string | null
  institution: string
  scraped_at: string
  term: string | null
}

export interface Assignment {
  id: string
  name: string
  category: string
  score: string | number | null
  max_score: number | null
  date?: string
  due_date?: string
  submitted_at?: string
  status: string
  lesson_id?: string
}

export interface Category {
  name: string
  weight: number
  current_score: number | null
}

export interface Course {
  id: string
  name: string
  instructor: string | null
  credits: number | null
  current_grade: string | null
  current_percentage: number | null
  assignments: Assignment[]
  categories: Category[]
}

export interface GradesSnapshot {
  metadata: GradeMetadata
  courses: Course[]
}

export interface GradesSnapshotRow {
  id: string
  user_id: string
  scraped_at: string
  term: string | null
  raw_json: GradesSnapshot
  created_at: string
}
