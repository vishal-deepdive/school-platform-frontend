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

export type ChartType =
  | "bar"
  | "horizontal_bar"
  | "grouped_bar"
  | "line"
  | "scatter"
  | "pie"; // pie retained for backward compatibility; no longer emitted

/** How the primary measure should be formatted on axes/labels/tooltips. */
export type ChartValueFormat = "percent" | "count" | "number";

/** Colour intent for the categorical axis, decided server-side by the data's job. */
export type ChartPalette = "sentiment" | "score" | "primary" | "categorical";

export interface ChartData {
  type: ChartType;
  title: string;
  x_key: string;
  y_keys: string[];
  x_label?: string;
  y_label?: string;
  value_format?: ChartValueFormat;
  palette?: ChartPalette;
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

/**
 * "failed" never reaches the client as a 200 — the backend raises a 400 for a
 * total-failure sync (see controller.sync_source) — but a caller reading the
 * register-and-autosync response (`SourceSyncResult`, which IS a 200 even when
 * `ok: false`) should still be able to distinguish it from "partial"/"ok".
 */
export type SyncOutcome = "ok" | "partial" | "no_new_rows" | "failed" | string;

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

export interface FailedRecord {
  name: string | null;
  roll_number: string | null;
  reason: string;
}

export interface LoadRecentResponse {
  status: string;
  timestamp: string;
  mode: SyncMode;
  cycle: string;
  /** "partial"/"no_new_rows" need a visibly different treatment than a plain
   * success even though both are HTTP 200 — "failed" never reaches here. */
  sync_outcome: SyncOutcome;
  summary: SummarySheet;
  /** First few distinct, truncated row-level error messages, if any failed. */
  error_reasons: string[];
  database_change: DatabaseChange;
  added_records: unknown[];
  skipped_records: unknown[];
  failed_records: FailedRecord[];
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
  /** Imported survey rows currently attached to this source. Deleting the
   * source deletes these too (see DELETE /source/{id}) — shown in the delete
   * confirmation so the impact is never a surprise. */
  row_count: number;
}

/** Outcome of the auto-sync run when a source is registered (POST /source). */
export interface SourceSyncResult {
  ok: boolean;
  records_added: number;
  records_skipped: number;
  records_failed: number;
  sync_outcome: SyncOutcome;
  error_reasons: string[];
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

export interface ParseWarning {
  column: string;
  unparsed_sample_rows: number;
}

export interface HeaderPreviewResponse {
  status: string;
  sheet_id: string;
  gid: string;
  headers: string[];
  auto_mapped: Record<string, string>;
  unmapped: string[];
  canonical_columns: string[];
  /** Canonical columns where a real (non-blank) value in the sampled rows
   * failed to coerce — a heads-up at registration time instead of only
   * discovering it after a full sync. */
  parse_warnings: ParseWarning[];
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
  /** Survey rows deleted along with the source (see migration 048 — deleting
   * a source now deletes the rows it brought in, not just unlinks them). */
  deleted_rows?: number;
}

// ── Detached responses (admin cleanup) ─────────────────────────────────────

export interface DetachedGroup {
  school_id: string | null;
  school_name: string | null;
  count: number;
}

export interface DetachedResponsesResponse {
  status: string;
  total_detached: number;
  groups: DetachedGroup[];
}

export interface PurgeDetachedResponse {
  status: string;
  deleted_count: number;
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

// ── Satisfaction analytics (GET /survey/analytics) ──────────────────────────

export interface SurveyDimensionStat {
  key: string;
  label: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  positive_pct: number | null;
  /** True when this slice has too few respondents to show a percentage safely. */
  suppressed: boolean;
}

export interface SurveyRecScore {
  score: number;
  count: number;
}

export interface SurveyRecommendation {
  average: number | null;
  responses: number;
  promoters_pct: number | null;
  detractors_pct: number | null;
  distribution: SurveyRecScore[];
  suppressed: boolean;
}

export interface SurveySentiment {
  positive: number;
  neutral: number;
  negative: number;
  no_response: number;
  suppressed: boolean;
}

export interface SurveyClassStat {
  class_name: string;
  count: number;
  positive_pct: number | null;
  suppressed: boolean;
}

export interface SurveySubjectStat {
  subject: string;
  count: number;
}

export interface SurveyCycleInfo {
  cycle: string;
  response_count: number;
  first_response_at: string | null;
  last_response_at: string | null;
}

export interface SurveyDimensionTrend {
  key: string;
  label: string;
  current_positive_pct: number | null;
  previous_positive_pct: number | null;
  delta_pct: number | null;
}

export interface SurveyTrend {
  current_cycle: string;
  previous_cycle: string;
  total_responses_current: number;
  total_responses_previous: number;
  recommendation_avg_current: number | null;
  recommendation_avg_previous: number | null;
  overall_positive_pct_current: number | null;
  overall_positive_pct_previous: number | null;
  dimensions: SurveyDimensionTrend[];
}

export interface SurveyAnalyticsResponse {
  scope: "platform" | "school";
  school_name: string | null;
  total_responses: number;
  responded_classes: number;
  recommendation: SurveyRecommendation;
  overall_satisfaction: SurveySentiment;
  dimensions: SurveyDimensionStat[];
  by_class: SurveyClassStat[];
  toughest_subjects: SurveySubjectStat[];
  cycles: SurveyCycleInfo[];
  selected_cycle: string | null;
  trend: SurveyTrend | null;
}

export interface SurveyCyclesResponse {
  status: string;
  cycles: SurveyCycleInfo[];
}

export type SurveyThemeSentiment = "positive" | "negative" | "mixed";

export interface SurveyTheme {
  label: string;
  summary: string;
  sentiment: SurveyThemeSentiment;
  count: number;
  columns: string[];
  sample_quotes: string[];
}

export interface SurveyThemesResponse {
  status: string;
  themes: SurveyTheme[];
  sample_size: number;
  insufficient_data: boolean;
  generated_at: string | null;
}
