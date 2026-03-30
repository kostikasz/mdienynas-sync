export interface HomeworkEntry {
  id:            string
  subject:       string
  lesson_id:     string | null
  teacher:       string | null
  description:   string | null
  assigned_date: string | null
  due_date:      string | null
  homework_url:  string | null
}

export interface HomeworkData {
  generated_at: string
  source:       string
  count:        number
  homework:     HomeworkEntry[]
}
