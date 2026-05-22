export type QuestionType = 'MCQ' | 'BRIEF'
export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface RagFilters {
  book?: string
  class_level?: string
  subject?: string
  chapter_name?: string[]
  title?: string[]
}

export interface QARequest {
  query: string
  filters?: RagFilters
}

export interface QASource {
  chunk_id: string
  book?: string
  chapter_name?: string
  title?: string
  page?: number
  score?: number
}

export interface QAResponse {
  answer: string
  sources: QASource[]
}

export interface QuestionsRequest {
  filters: RagFilters
  q_type: QuestionType
  difficulty: Difficulty
  num_questions: number
  marks?: number
}

export interface NotesRequest {
  filters: RagFilters
}

export interface ContentResponse {
  content: string
}

export interface RagMetadata {
  books: string[]
  classes: string[]
  subjects: string[]
  chapters: string[]
  titles: string[]
}

export interface CascadingFiltersRequest {
  book?: string
  class_level?: string
  subject?: string
  chapter_name?: string
}

export interface AuditCounts {
  by_book: unknown[]
  by_class: unknown[]
  by_subject: unknown[]
}

export interface AuditMissingFields {
  titles: number
  chapter_names: number
}

export interface RagAuditResponse {
  total_chunks: number
  counts: AuditCounts
  missing_fields: AuditMissingFields
}

export interface RagDeleteResponse {
  deleted: number
}
