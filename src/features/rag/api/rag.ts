import { apiClient } from "@/shared/api/client";
import { streamSSE } from "@/shared/api/streaming";
import { API_V1 } from "@/shared/config/apiVersion";
import type {
  QARequest,
  QAStreamEvent,
  QuestionsRequest,
  NotesRequest,
  ContentStreamEvent,
  RagMetadata,
  RagAuditResponse,
  RagDeleteResponse,
  RagFilters,
  IngestJobResponse,
  DocumentStatusResponse,
  DocumentListResponse,
  DocumentChunksResponse,
  ClassLevelsResponse,
  MediumsResponse,
  RagAnalyticsResponse,
  FeedbackRequest,
  FeedbackResponse,
  GenerateQuizRequest,
  GenerateQuizResponse,
  CreateAssignmentRequest,
  AssignmentSummary,
  AssignmentListResponse,
  AssignmentDetail,
  SubmitAssignmentRequest,
  SubmissionResult,
  AssignmentResultsResponse,
  GenerateFlashcardsRequest,
  FlashcardDeckDetail,
  FlashcardDeckListResponse,
  FlashcardProgressResponse,
  LessonPlanRequest,
  CreateContentRequestRequest,
  ContentRequestItem,
  ContentRequestListResponse,
  ContentRequestStatus,
  FeedbackListResponse,
  UsageAnalyticsResponse,
} from "@/features/rag/types";

const BASE = `${API_V1}/rag`;

export const ragApi = {
  getMetadata: () =>
    apiClient.get<RagMetadata>(`${BASE}/metadata`).then((r) => r.data),

  getClassLevels: () =>
    apiClient
      .get<ClassLevelsResponse>(`${BASE}/classes`)
      .then((r) => r.data),

  /** Book medium(s) the caller may select for uploads and filters. */
  getMediums: () =>
    apiClient.get<MediumsResponse>(`${BASE}/mediums`).then((r) => r.data),

  refreshMetadata: () =>
    apiClient.post(`${BASE}/metadata/refresh`).then((r) => r.data),

  /** Streaming Q&A — yields {type:"token"|"done"|"error", ...} events. */
  qaStream: (data: QARequest, signal?: AbortSignal) =>
    streamSSE<QAStreamEvent>(`${BASE}/qa/stream`, data, signal),

  downloadPdf: (data: { markdown: string; title?: string }) =>
    apiClient.post(`${BASE}/pdf/generate`, data, {
      responseType: "blob",
    }).then((r) => r.data),

  /** Streaming question generation — yields {type:"token"|"done"|"error", ...} events. */
  generateQuestionsStream: (data: QuestionsRequest, signal?: AbortSignal) =>
    streamSSE<ContentStreamEvent>(`${BASE}/questions/stream`, data, signal),

  /** Streaming notes generation — yields {type:"token"|"done"|"error", ...} events. */
  generateNotesStream: (data: NotesRequest, signal?: AbortSignal) =>
    streamSSE<ContentStreamEvent>(`${BASE}/notes/stream`, data, signal),

  deleteChunks: (filters: RagFilters) =>
    apiClient
      .delete<RagDeleteResponse>(`${BASE}/chunks`, { data: filters })
      .then((r) => r.data),

  deleteAllChunks: () =>
    apiClient
      .delete<RagDeleteResponse>(`${BASE}/chunks/all`)
      .then((r) => r.data),

  getAudit: () =>
    apiClient.get<RagAuditResponse>(`${BASE}/audit`).then((r) => r.data),

  uploadDocument: (data: FormData) =>
    apiClient
      .post<IngestJobResponse>(`${BASE}/documents`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data),

  listDocuments: (params: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    /** Admin only: scope the listing to one school's uploads + global content. */
    school_id?: string;
    /** Narrow to one book medium within what the caller can see. */
    medium?: string;
  }) =>
    apiClient
      .get<DocumentListResponse>(`${BASE}/documents`, { params })
      .then((r) => r.data),

  getDocumentChunks: (documentId: string) =>
    apiClient
      .get<DocumentChunksResponse>(`${BASE}/documents/${documentId}/chunks`)
      .then((r) => r.data),

  getDocumentStatus: (documentId: string) =>
    apiClient
      .get<DocumentStatusResponse>(`${BASE}/documents/${documentId}`)
      .then((r) => r.data),

  deleteDocument: (documentId: string) =>
    apiClient
      .delete<{ deleted: boolean; document_id: string }>(
        `${BASE}/documents/${documentId}`
      )
      .then((r) => r.data),

  retryIngest: (documentId: string) =>
    apiClient
      .post<IngestJobResponse>(`${BASE}/documents/${documentId}/retry`)
      .then((r) => r.data),

  /** Knowledge-base corpus analytics for the dashboard (staff-scoped). */
  /**
   * Knowledge-base analytics. Staff are scoped to their own school server-side;
   * admins pass the active school's id to scope to it (omit for platform-wide).
   */
  getAnalytics: (schoolId?: string) =>
    apiClient
      .get<RagAnalyticsResponse>(`${BASE}/analytics`, {
        params: schoolId ? { school_id: schoolId } : undefined,
      })
      .then((r) => r.data),

  /** Record a thumbs up/down rating on a generated Q&A answer. */
  submitFeedback: (data: FeedbackRequest) =>
    apiClient
      .post<FeedbackResponse>(`${BASE}/qa/feedback`, data)
      .then((r) => r.data),

  // ── Learning loop: practice / assignments ─────────────────────────────────

  /** Generate a structured MCQ set (with answer key) from filtered content. */
  generatePractice: (data: GenerateQuizRequest) =>
    apiClient
      .post<GenerateQuizResponse>(`${BASE}/practice/generate`, data)
      .then((r) => r.data),

  createAssignment: (data: CreateAssignmentRequest) =>
    apiClient
      .post<AssignmentSummary>(`${BASE}/assignments`, data)
      .then((r) => r.data),

  listAssignments: (params: {
    scope?: "mine" | "manage";
    class_level?: string;
    limit?: number;
    offset?: number;
  }) =>
    apiClient
      .get<AssignmentListResponse>(`${BASE}/assignments`, { params })
      .then((r) => r.data),

  getAssignment: (id: string) =>
    apiClient
      .get<AssignmentDetail>(`${BASE}/assignments/${id}`)
      .then((r) => r.data),

  submitAssignment: (id: string, data: SubmitAssignmentRequest) =>
    apiClient
      .post<SubmissionResult>(`${BASE}/assignments/${id}/submit`, data)
      .then((r) => r.data),

  getAssignmentResults: (id: string) =>
    apiClient
      .get<AssignmentResultsResponse>(`${BASE}/assignments/${id}/results`)
      .then((r) => r.data),

  deleteAssignment: (id: string) =>
    apiClient
      .delete<{ deleted: boolean; id: string }>(`${BASE}/assignments/${id}`)
      .then((r) => r.data),

  // ── Flashcards ────────────────────────────────────────────────────────────

  generateFlashcards: (data: GenerateFlashcardsRequest) =>
    apiClient
      .post<FlashcardDeckDetail>(`${BASE}/flashcards/generate`, data)
      .then((r) => r.data),

  listFlashcardDecks: (params: { limit?: number; offset?: number }) =>
    apiClient
      .get<FlashcardDeckListResponse>(`${BASE}/flashcards`, { params })
      .then((r) => r.data),

  getFlashcardDeck: (id: string) =>
    apiClient
      .get<FlashcardDeckDetail>(`${BASE}/flashcards/${id}`)
      .then((r) => r.data),

  setFlashcardProgress: (id: string, masteredCardIds: string[]) =>
    apiClient
      .put<FlashcardProgressResponse>(`${BASE}/flashcards/${id}/progress`, {
        mastered_card_ids: masteredCardIds,
      })
      .then((r) => r.data),

  deleteFlashcardDeck: (id: string) =>
    apiClient
      .delete<{ deleted: boolean; id: string }>(`${BASE}/flashcards/${id}`)
      .then((r) => r.data),

  // ── Lesson plan (streaming) ───────────────────────────────────────────────

  generateLessonPlanStream: (data: LessonPlanRequest, signal?: AbortSignal) =>
    streamSSE<ContentStreamEvent>(`${BASE}/lesson-plan/stream`, data, signal),

  // ── Content requests ──────────────────────────────────────────────────────

  createContentRequest: (data: CreateContentRequestRequest) =>
    apiClient
      .post<ContentRequestItem>(`${BASE}/content-requests`, data)
      .then((r) => r.data),

  listContentRequests: (params: {
    status?: ContentRequestStatus;
    limit?: number;
    offset?: number;
  }) =>
    apiClient
      .get<ContentRequestListResponse>(`${BASE}/content-requests`, { params })
      .then((r) => r.data),

  updateContentRequest: (id: string, status: ContentRequestStatus) =>
    apiClient
      .patch<ContentRequestItem>(`${BASE}/content-requests/${id}`, { status })
      .then((r) => r.data),

  // ── Feedback review + adoption analytics ──────────────────────────────────

  listFeedback: (params: { rating?: number; limit?: number; offset?: number }) =>
    apiClient
      .get<FeedbackListResponse>(`${BASE}/feedback`, { params })
      .then((r) => r.data),

  getUsageAnalytics: (days = 30, schoolId?: string) =>
    apiClient
      .get<UsageAnalyticsResponse>(`${BASE}/usage/analytics`, {
        params: { days, ...(schoolId ? { school_id: schoolId } : {}) },
      })
      .then((r) => r.data),
};
