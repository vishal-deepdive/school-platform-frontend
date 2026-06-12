export type QuestionType = "MCQ" | "BRIEF";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface RagFilters {
  class_level?: string;
  subject?: string;
  chapter_name?: string[];
  title?: string[];
}

export interface QARequest {
  query: string;
  filters?: RagFilters;
}

export interface QASource {
  file?: string;
  /** Pre-formatted "chapterNo - chapterName" string from the backend. */
  chapter_name?: string;
  title?: string;
  /** Comma-separated page list (e.g. "12,13") — stored as text. */
  page?: string;
  /** Pre-formatted similarity percentage (e.g. "82%"). */
  similarity?: string;
}

export interface QAResponse {
  answer: string;
  sources: QASource[];
}

/** A single message in the Q&A chat transcript. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: QASource[];
}

export interface QuestionsRequest {
  filters: RagFilters;
  q_type: QuestionType;
  difficulty: Difficulty;
  num_questions: number;
  marks?: number;
}

export interface NotesRequest {
  filters: RagFilters;
}

export interface ContentResponse {
  content: string;
}

/**
 * Nested knowledge-base hierarchy:
 *   hierarchy[className].subjects        → string[]
 *   hierarchy[className][subject].chapters → string[]
 *   hierarchy[className][subject][chapter].titles → string[]
 * Loosely typed because keys are dynamic (class / subject / chapter names).
 */
export type RagHierarchy = Record<
  string,
  { subjects?: string[] } & Record<string, any>
>;

export interface RagMetadata {
  classes: string[];
  hierarchy: RagHierarchy;
}

/** Selectable class levels for the current user (school-scoped or admin full list). */
export interface ClassLevelsResponse {
  class_levels: string[];
}

export interface CascadingFiltersRequest {
  class_level?: string;
  subject?: string;
  chapter_name?: string;
}

export interface AuditCounts {
  by_class: unknown[];
  by_subject: unknown[];
}

export interface AuditMissingFields {
  titles: number;
  chapter_names: number;
}

export interface RagAuditResponse {
  total_chunks: number;
  counts: AuditCounts;
  missing_fields: AuditMissingFields;
}

export interface RagDeleteResponse {
  deleted: number;
}

export interface IngestJobResponse {
  job_id?: string;
  document_id: string;
  status: string;
  deduplicated: boolean;
  message: string;
}

export interface DocumentStatusResponse {
  job_id?: string;
  document_id: string;
  status: string;
  progress?: string;
  error?: string;
  total_chunks?: number;
  result?: Record<string, unknown>;
}

export interface DocumentItem {
  id: string;
  school_id?: string;
  class_level: string;
  subject: string;
  chapter_number: string;
  chapter_name: string;
  original_filename: string;
  mime_type?: string;
  file_size: number;
  parser: string;
  status: string;
  error?: string;
  total_chunks?: number;
  uploaded_by?: string;
  job_id?: string;
  created_at?: string;
  completed_at?: string;
}

export interface DocumentListResponse {
  items: DocumentItem[];
  total: number;
  limit: number;
  offset: number;
}
