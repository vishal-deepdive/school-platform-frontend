export type SearchIntent = 'QUANT' | 'QUAL' | 'MIXED'
export type FeedbackColumn = 'teacher_feedback' | 'school_feedback' | 'school_suggestions'

export interface SurveyStatusResponse {
  status: string
  timestamp: string
  total_records: number
  embeddings: Record<string, number>
  by_school: Record<string, unknown>[]
  by_class: Record<string, unknown>[]
  by_class_with_subject_groups: Record<string, unknown>
}

export interface SearchRequest {
  query: string
  feedback_column: FeedbackColumn
  limit: number
  filters?: Record<string, unknown>
}

export interface RetrievedRows {
  type: string
  data?: Record<string, unknown>[]
  sample_size?: number
  count?: number
  similarity_scores?: number[]
  quantitative?: Record<string, unknown>
  qualitative?: Record<string, unknown>
}

export interface SearchResponse {
  status: string
  intent: SearchIntent
  final_response: string
  chart_url?: string
  chart_info: Record<string, unknown>
  retrieved_rows: RetrievedRows
  numbers_for_graph: Record<string, unknown>
  sql_query?: string
}

export interface SummarySheet {
  total_rows_in_sheet: number
  records_added: number
  records_skipped: number
  records_without_embeddings: number
}

export interface DatabaseChange {
  before: number
  after: number
  change: number
}

export interface LoadRecentResponse {
  status: string
  timestamp: string
  summary: SummarySheet
  database_change: DatabaseChange
  added_records: unknown[]
  skipped_records: unknown[]
}

export interface SurveyDeleteResponse {
  status: string
  message: string
  deleted_count: number
  deleted_records: Record<string, unknown>[]
  filters?: Record<string, unknown>
}

export interface ChartsListResponse {
  status: string
  total_charts: number
  charts: string[]
}
