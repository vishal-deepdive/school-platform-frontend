export type QuestionType = "MCQ" | "BRIEF";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface RagFilters {
  class_level?: string;
  subject?: string;
  chapter_name?: string[];
  title?: string[];
  /** Narrows within the caller's school-derived medium scope; omit for every
   * medium the caller's school allows (all of them for a Bilingual school). */
  medium?: "English" | "Hindi";
}

export interface QARequest {
  query: string;
  filters?: RagFilters;
  /** 'simpler' re-explains at a lower reading level. */
  explain_mode?: "simpler";
  /** Answer in this language (e.g. "Hindi"). Defaults to English. */
  language?: string;
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
  /** Excerpt of the grounding passage — powers the "cite & jump" source preview. */
  snippet?: string | null;
  /** Provenance document id, when the chunk is linked to an uploaded document. */
  document_id?: string | null;
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
  /** Include the answer key in the output (default true). */
  include_answers?: boolean;
}

/** Payload for POST /rag/qa/feedback. */
export interface FeedbackRequest {
  rating: "up" | "down";
  question: string;
  answer?: string;
  comment?: string;
  filters?: RagFilters;
  sources?: QASource[];
}

export interface FeedbackResponse {
  recorded: boolean;
  feedback_id: string;
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

/** Selectable book mediums for the current user (derived from their school's
 * medium of instruction; admin gets both unconditionally). */
export interface MediumsResponse {
  mediums: string[];
}

export interface CascadingFiltersRequest {
  class_level?: string;
  subject?: string;
  chapter_name?: string;
  medium?: "English" | "Hindi";
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
  medium?: string;
  name?: string;
  count?: number;
  total?: number;
}

export interface AuditCounts {
  by_class: AuditCountRow[];
  by_subject: AuditCountRow[];
  by_medium: AuditCountRow[];
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
  medium: "English" | "Hindi";
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

// ── Library analytics (GET /rag/analytics) ──────────────────────────────────

export interface RagLibraryTotals {
  documents: number;
  chunks: number;
  completed: number;
  pending: number;
  failed: number;
  global_docs: number;
  school_docs: number;
  subjects: number;
  class_levels: number;
}

export interface RagSubjectStat {
  subject: string;
  count: number;
}

export interface RagClassStat {
  class_level: string;
  count: number;
}

export interface RagMediumStat {
  medium: string;
  count: number;
}

export interface RagStatusStat {
  status: string;
  count: number;
}

export interface RagRecentDocument {
  id: string;
  class_level?: string | null;
  subject?: string | null;
  chapter_name?: string | null;
  medium?: string | null;
  status: string;
  total_chunks?: number | null;
  is_global: boolean;
  created_at?: string | null;
}

export interface RagFeedbackSummary {
  total: number;
  up: number;
  down: number;
  helpful_pct?: number | null;
}

export interface RagAnalyticsResponse {
  scope: "platform" | "school";
  totals: RagLibraryTotals;
  by_subject: RagSubjectStat[];
  by_class: RagClassStat[];
  by_medium: RagMediumStat[];
  by_status: RagStatusStat[];
  recent: RagRecentDocument[];
  feedback?: RagFeedbackSummary | null;
}

// ── Document chunk preview (GET /rag/documents/{id}/chunks) ──────────────────

export interface DocumentChunk {
  chunk_id?: string | null;
  chapter?: string | null;
  chapter_name?: string | null;
  title?: string | null;
  page?: string | null;
  content: string;
}

export interface DocumentChunksResponse {
  document_id: string;
  total: number;
  chunks: DocumentChunk[];
}

// ── Learning loop: practice / assignments ───────────────────────────────────

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  /** Present only when the answer key is visible (teacher / after submit). */
  answer_index?: number | null;
  explanation?: string | null;
  topic?: string | null;
}

export interface GenerateQuizRequest {
  filters: RagFilters;
  difficulty: Difficulty;
  num_questions: number;
  /** Optional sub-topic focus (weak-topic remediation). */
  topic?: string;
}

export type AssignmentScoring = "last" | "best";

export interface GenerateQuizResponse {
  questions: QuizQuestion[];
}

export type AssignmentKind = "assignment" | "self_quiz";

export interface CreateAssignmentRequest {
  title: string;
  kind: AssignmentKind;
  class_level?: string;
  subject?: string;
  chapter_name?: string;
  difficulty?: Difficulty;
  questions: QuizQuestion[];
  filters?: RagFilters;
  due_at?: string | null;
  /** null = unlimited retakes. */
  attempts_allowed?: number | null;
  scoring?: AssignmentScoring;
  allow_late?: boolean;
  /** null = untimed. */
  time_limit_seconds?: number | null;
}

export interface AssignmentSummary {
  id: string;
  kind: AssignmentKind;
  title: string;
  class_level?: string | null;
  subject?: string | null;
  chapter_name?: string | null;
  difficulty?: string | null;
  num_questions: number;
  status: string;
  due_at?: string | null;
  created_at?: string | null;
  created_by_name?: string | null;
  // Attempt policy + pacing
  attempts_allowed?: number | null;
  scoring?: AssignmentScoring | null;
  allow_late?: boolean | null;
  time_limit_seconds?: number | null;
  // Student context
  submitted?: boolean | null;
  my_score?: number | null;
  my_total?: number | null;
  my_percentage?: number | null;
  my_attempt_count?: number | null;
  my_is_late?: boolean | null;
  // Teacher context
  submission_count?: number | null;
  avg_percentage?: number | null;
}

export interface AssignmentListResponse {
  items: AssignmentSummary[];
  total: number;
}

export interface PerQuestionResult {
  question_id: string;
  question: string;
  options: string[];
  topic?: string | null;
  selected_index?: number | null;
  answer_index: number;
  correct: boolean;
  explanation?: string | null;
}

export interface SubmissionResult {
  submission_id: string;
  score: number;
  total: number;
  percentage: number;
  attempt_count: number;
  is_late?: boolean;
  submitted_at?: string | null;
  results: PerQuestionResult[];
}

export interface AssignmentDetail {
  id: string;
  kind: AssignmentKind;
  title: string;
  class_level?: string | null;
  subject?: string | null;
  chapter_name?: string | null;
  difficulty?: string | null;
  num_questions: number;
  status: string;
  due_at?: string | null;
  created_at?: string | null;
  created_by_name?: string | null;
  attempts_allowed?: number | null;
  scoring?: AssignmentScoring | null;
  allow_late?: boolean | null;
  time_limit_seconds?: number | null;
  can_view_answers: boolean;
  can_attempt?: boolean;
  questions: QuizQuestion[];
  my_submission?: SubmissionResult | null;
}

export interface SubmitAnswer {
  question_id: string;
  selected_index?: number | null;
  /** Approx. time attributed to this question (ms, best-effort). */
  time_ms?: number | null;
}

export interface SubmitAssignmentRequest {
  answers: SubmitAnswer[];
  time_spent_seconds?: number;
}

export interface QuestionStat {
  question_id: string;
  question: string;
  topic?: string | null;
  correct_count: number;
  total_count: number;
  accuracy_pct?: number | null;
  avg_time_seconds?: number | null;
}

export interface TopicStat {
  topic: string;
  correct: number;
  total: number;
  accuracy_pct?: number | null;
}

export interface StudentResultRow {
  student_id: string;
  student_name?: string | null;
  score: number;
  total: number;
  percentage: number;
  attempt_count: number;
  submitted_at?: string | null;
}

export interface AssignmentResultsResponse {
  assignment: AssignmentSummary;
  submission_count: number;
  avg_percentage?: number | null;
  question_stats: QuestionStat[];
  weak_topics: TopicStat[];
  students: StudentResultRow[];
}

// ── Flashcards ──────────────────────────────────────────────────────────────

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string | null;
}

export interface GenerateFlashcardsRequest {
  filters: RagFilters;
  num_cards: number;
  title?: string;
  /** Optional sub-topic focus (weak-topic remediation). */
  topic?: string;
}

export interface FlashcardDeckSummary {
  id: string;
  title: string;
  class_level?: string | null;
  subject?: string | null;
  chapter_name?: string | null;
  card_count: number;
  created_at?: string | null;
  created_by_name?: string | null;
  /** Raw creator id + school scope — determines whether the caller may delete
   * this deck (own-only for teachers; global decks are admin-only). */
  created_by?: string | null;
  school_id?: string | null;
  /** Cards the current user has mastered (server-side progress). */
  mastered_count?: number;
}

export interface FlashcardDeckListResponse {
  items: FlashcardDeckSummary[];
  total: number;
}

export interface FlashcardDeckDetail extends FlashcardDeckSummary {
  cards: Flashcard[];
  mastered_card_ids?: string[];
}

export interface FlashcardProgressResponse {
  deck_id: string;
  mastered_card_ids: string[];
}

// ── Lesson plan ─────────────────────────────────────────────────────────────

export interface LessonPlanRequest {
  filters: RagFilters;
}

// ── Content requests ────────────────────────────────────────────────────────

export type ContentRequestStatus =
  | "open"
  | "in_progress"
  | "fulfilled"
  | "dismissed";

export interface CreateContentRequestRequest {
  class_level?: string;
  subject?: string;
  chapter_name?: string;
  /** Which book medium the missing content is needed in. */
  medium?: "English" | "Hindi";
  note?: string;
}

export interface ContentRequestItem {
  id: string;
  class_level?: string | null;
  subject?: string | null;
  chapter_name?: string | null;
  medium?: string | null;
  note?: string | null;
  status: ContentRequestStatus;
  requested_by_name?: string | null;
  resolved_by_name?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
}

export interface ContentRequestListResponse {
  items: ContentRequestItem[];
  total: number;
  open_count: number;
}

// ── Feedback review queue ───────────────────────────────────────────────────

export interface FeedbackItem {
  id: string;
  rating: number;
  question?: string | null;
  answer?: string | null;
  comment?: string | null;
  filters?: Record<string, unknown> | null;
  sources?: Record<string, unknown>[] | null;
  user_name?: string | null;
  created_at?: string | null;
}

export interface FeedbackListResponse {
  items: FeedbackItem[];
  total: number;
  up: number;
  down: number;
}

// ── Usage / adoption analytics ──────────────────────────────────────────────

export interface UsageEventStat {
  event_type: string;
  count: number;
}

export interface UsageDailyPoint {
  date: string;
  count: number;
}

export interface UsageSubjectStat {
  subject: string;
  count: number;
}

export interface UsageTopUser {
  user_id?: string | null;
  user_name?: string | null;
  role?: string | null;
  count: number;
}

export interface UsageAnalyticsResponse {
  scope: "platform" | "school";
  total_events: number;
  active_users: number;
  by_event: UsageEventStat[];
  by_day: UsageDailyPoint[];
  by_subject: UsageSubjectStat[];
  top_users: UsageTopUser[];
  window_days: number;
}
