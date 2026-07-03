export type SearchIntent = "QUANT" | "QUAL" | "MIXED";
export type FeedbackColumn =
  | "teacher_feedback"
  | "school_feedback"
  | "school_suggestions";

export interface SurveyStatusResponse {
  status: string;
  timestamp: string;
  total_records: number;
  embeddings: Record<string, number>;
  by_school: Record<string, unknown>[];
  by_class: Record<string, unknown>[];
  by_class_with_subject_groups: Record<string, unknown>;
}

export interface SearchRequest {
  query: string;
  /** School to scope the search to. Required for admins; ignored for other roles. */
  school_name?: string;
  class_name?: string;
  feedback_column?: FeedbackColumn;
  limit?: number;
  filters?: Record<string, unknown>;
  /** Restrict the search to these survey source (sheet) ids. */
  source_ids?: string[];
}

export interface ChartData {
  type: "bar" | "horizontal_bar" | "pie" | "scatter";
  title: string;
  x_key: string;
  y_keys: string[];
  data: Record<string, unknown>[];
}

export interface SearchData {
  type: string;
  results?: Record<string, unknown>[];
  sample_size?: number;
  count?: number;
  quantitative?: { results: Record<string, unknown>[]; sample_size: number };
  qualitative?: { count: number; results: Record<string, unknown>[] };
}

export interface SearchResponse {
  status: string;
  intent: SearchIntent;
  insight: string;
  chart_url?: string | null;
  chart_data?: ChartData | null;
  data: SearchData;
  sql_query?: string | null;
  prompt_debug?: Record<string, unknown>[];
}

// ── SSE stream events from POST /search/stream ────────────────────────────

export interface SearchStreamMeta {
  type: "meta";
  intent: SearchIntent;
  chart_url?: string | null;
  chart_data?: ChartData | null;
  data: SearchData;
  sql_query?: string | null;
}

export interface SearchStreamToken {
  type: "token";
  content: string;
}

export interface SearchStreamDone {
  type: "done";
  prompt_debug?: Record<string, unknown>[];
}

export interface SearchStreamError {
  type: "error";
  message: string;
}

export type SearchStreamEvent =
  | SearchStreamMeta
  | SearchStreamToken
  | SearchStreamDone
  | SearchStreamError;

export interface SummarySheet {
  total_rows_in_sheet: number;
  records_added: number;
  records_skipped: number;
  records_without_embeddings: number;
  records_failed?: number;
  rows_deleted?: number;
}

export type SyncMode = "append" | "replace";

export interface DatabaseChange {
  before: number;
  after: number;
  change: number;
}

export type EmbeddingStatus = "completed" | "processing" | "pending" | string;

export interface SchemaDrift {
  added: string[];
  removed: string[];
  unchanged: number;
}

export interface LoadRecentResponse {
  status: string;
  timestamp: string;
  mode: SyncMode;
  cycle: string;
  summary: SummarySheet;
  database_change: DatabaseChange;
  added_records: unknown[];
  skipped_records: unknown[];
  embedding_status: EmbeddingStatus;
  job_id?: string | null;
  schema_drift?: SchemaDrift | null;
}

export type SyncJobStatus =
  | "inserting"
  | "embedding"
  | "done"
  | "failed"
  | string;

export interface SyncJobStatusResponse {
  job_id: string;
  status: SyncJobStatus;
  started_at: string;
  completed_at?: string | null;
  rows_inserted: number;
  rows_skipped: number;
  rows_embedded: number;
  rows_deleted?: number;
  rows_failed?: number;
  error?: string | null;
}

export interface SurveyDeleteResponse {
  status: string;
  message: string;
  deleted_count: number;
  deleted_records: Record<string, unknown>[];
  filters?: Record<string, unknown>;
}

// ── Source types (multi-source) ────────────────────────────────────────────

export type SurveyType = "general" | "academic" | "facility" | "teacher_evaluation" | string;

/** A single registered Google Sheet source. */
export interface SourceItem {
  id: string;
  school_name?: string | null;
  sheet_url?: string | null;
  sheet_id?: string | null;
  gid?: string | null;
  label?: string | null;
  cycle?: string | null;
  survey_type: SurveyType;
  is_active: boolean;
  column_map?: Record<string, string> | null;
  headers_snapshot?: string[] | null;
  last_synced_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

/** Outcome of the auto-sync run when a source is registered (POST /source). */
export interface SourceSyncResult {
  ok: boolean;
  records_added: number;
  records_skipped: number;
  records_failed: number;
  embedding_status?: string | null;
  job_id?: string | null;
  error?: string | null;
}

export interface SurveySourceResponse {
  status: string;
  configured: boolean;
  source?: SourceItem | null;
  school_name?: string | null;
  sheet_url?: string | null;
  sheet_id?: string | null;
  gid?: string | null;
  label?: string | null;
  cycle?: string | null;
  column_map?: Record<string, string> | null;
  last_synced_at?: string | null;
  updated_at?: string | null;
  /** Present only on the register response. */
  sync?: SourceSyncResult | null;
}

export interface SourceListResponse {
  status: string;
  sources: SourceItem[];
  school_name?: string | null;
}

export interface HeaderPreviewResponse {
  status: string;
  sheet_id: string;
  gid: string;
  headers: string[];
  auto_mapped: Record<string, string>;
  unmapped: string[];
  canonical_columns: string[];
}

export interface RegisterSourceRequest {
  sheet_url: string;
  school_name?: string;
  label?: string;
  cycle?: string;
  survey_type?: SurveyType;
  column_map?: Record<string, string>;
}

export interface UpdateSourceRequest {
  label?: string;
  cycle?: string;
  survey_type?: SurveyType;
  column_map?: Record<string, string>;
  is_active?: boolean;
}

export interface SurveySourceDeleteResponse {
  status: string;
  message: string;
  deleted: boolean;
}

export interface ChartFile {
  filename: string;
  size_bytes: number;
  created_at: string;
}

export interface ChartsListResponse {
  status: string;
  total_charts: number;
  charts: ChartFile[];
}
