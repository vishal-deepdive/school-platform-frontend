export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "not_found";

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  message: string;
  /**
   * Set by the backend when an identical audio file has already been
   * processed; the existing result can be shown immediately instead of
   * polling a freshly-queued job.
   */
  deduplicated?: boolean;
  /** Present on a deduplicated response so we can fetch the prior result. */
  record_id?: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress?: string;
  error?: string;
  /**
   * NOTE: the backend no longer returns the generated content here — `result`
   * is always null. Fetch the markdown via GET /result/{job_id}/markdown once
   * `status === "completed"`.
   */
  result?: unknown;
  /** Position in the processing queue while pending (1-based). */
  queue_position?: number;
  /** Estimated seconds until processing completes. */
  eta_seconds?: number;
}

export interface Recording {
  id: string;
  date: string;
  school_name: string;
  class: string;
  section?: string;
  subject?: string;
  recording_subject?: string;
  audio_filename: string;
  job_id?: string;
  /** Uploader user id + resolved display name (from the users join). */
  uploaded_by?: string;
  uploader_name?: string;
  /** Distribution state: draft | pending | published | archived. */
  visibility?: string;
  title?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  created_at?: string;
}

/** Columns the recordings list may be sorted by (must match the backend allow-list). */
export type RecordingSortBy =
  | "created_at"
  | "date"
  | "class"
  | "subject"
  | "title"
  | "duration_seconds"
  | "file_size_bytes"
  | "school_name";

/** Query parameters accepted by the recordings list endpoint. */
export interface RecordingListQuery {
  limit: number;
  offset: number;
  /** Sent as the `class` query alias expected by the backend. */
  class?: string;
  section?: string;
  subject?: string;
  recording_subject?: string;
  date?: string;
  school_name?: string;
  sort_by?: RecordingSortBy;
  order?: "asc" | "desc";
}

export interface RecordingsListResponse {
  recordings: Recording[];
  total: number;
  limit: number;
  offset: number;
}

export interface BulkDeleteResponse {
  message: string;
  deleted_count: number;
}

export interface AuditLog {
  id: string;
  date: string;
  school_name: string;
  class_name: string;
  section?: string;
  subject?: string;
  recording_subject?: string;
  audio_filename: string;
  job_id?: string;
  activity: string;
  activity_timestamp?: string;
  created_at?: string;
}

export interface AuditLogsListResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface DeleteRecordingResponse {
  message: string;
  record_id: string;
}

export interface SearchResultItem {
  id: string;
  date?: string;
  school_name: string;
  class?: string;
  section?: string;
  subject?: string;
  recording_subject?: string;
  job_id?: string;
  similarity?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
}

/**
 * Outcome of fetching generated markdown. The markdown endpoints now return
 * 404 (no result on record) and 409 (still generating) instead of a 200 with
 * a plain-text error body, so callers must branch on the state rather than
 * rendering whatever string comes back.
 */
export type MarkdownResult =
  | { state: "ready"; markdown: string }
  | { state: "generating" }
  | { state: "not_found" }
  | { state: "error"; message: string };

/** Sections of a generated result, gated by role on the backend. */
export type ResultSection =
  | "notes"
  | "practice"
  | "resources"
  | "actions"
  | "feedback"
  | "misconceptions";
