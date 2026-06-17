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

/** A single message in the Q&A chat transcript. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: QASource[];
  /** Set when streaming ended with an `{"type": "error"}` event — content holds the error message. */
  isError?: boolean;
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

/** Streaming events for POST /qa/stream. */
export type QAStreamEvent =
  | { type: "token"; content: string }
  | { type: "done"; sources: QASource[] }
  | { type: "error"; message: string };

/** Streaming events for POST /questions/stream and POST /notes/stream. */
export type ContentStreamEvent =
  | { type: "token"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

/**
 * One subject node inside the hierarchy. `chapters` is the only fixed key;
 * deeper levels (chapter → titles) keep dynamic string keys.
 */
export interface RagSubjectNode {
  chapters?: string[];
  [chapter: string]: { titles?: string[] } | string[] | undefined;
}

/**
 * One class node inside the hierarchy. `subjects` is the only fixed key; the
 * remaining keys are dynamic subject names mapping to {@link RagSubjectNode}.
 */
export interface RagClassNode {
  subjects?: string[];
  [subject: string]: RagSubjectNode | string[] | undefined;
}

/**
 * Nested knowledge-base hierarchy:
 *   hierarchy[className].subjects        → string[]
 *   hierarchy[className][subject].chapters → string[]
 *   hierarchy[className][subject][chapter].titles → string[]
 * Keys below the fixed `subjects` / `chapters` levels are dynamic (class /
 * subject / chapter names), so the dynamic levels are loosely typed.
 */
export type RagHierarchy = Record<string, RagClassNode>;

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

/**
 * One aggregated row in the audit counts. The backend labels the bucket with
 * one of these keys depending on the grouping, and reports the chunk total as
 * `count` (or `total`).
 */
export interface AuditCountRow {
  book?: string;
  class_level?: string;
  subject?: string;
  name?: string;
  count?: number;
  total?: number;
}

export interface AuditCounts {
  by_class: AuditCountRow[];
  by_subject: AuditCountRow[];
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
