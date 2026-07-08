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
  RagAnalyticsResponse,
  FeedbackRequest,
  FeedbackResponse,
} from "@/features/rag/types";

const BASE = `${API_V1}/rag`;

export const ragApi = {
  getMetadata: () =>
    apiClient.get<RagMetadata>(`${BASE}/metadata`).then((r) => r.data),

  getClassLevels: () =>
    apiClient
      .get<ClassLevelsResponse>(`${BASE}/classes`)
      .then((r) => r.data),

  refreshMetadata: () =>
    apiClient.post(`${BASE}/metadata/refresh`).then((r) => r.data),

  /** Streaming Q&A — yields {type:"token"|"done"|"error", ...} events. */
  qaStream: (data: QARequest, signal?: AbortSignal) =>
    streamSSE<QAStreamEvent>(`${BASE}/qa/stream`, data, signal),

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
  getAnalytics: () =>
    apiClient.get<RagAnalyticsResponse>(`${BASE}/analytics`).then((r) => r.data),

  /** Record a thumbs up/down rating on a generated Q&A answer. */
  submitFeedback: (data: FeedbackRequest) =>
    apiClient
      .post<FeedbackResponse>(`${BASE}/qa/feedback`, data)
      .then((r) => r.data),
};
