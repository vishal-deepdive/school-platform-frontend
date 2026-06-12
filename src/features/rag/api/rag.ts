import { apiClient } from "@/shared/api/client";
import type {
  QARequest,
  QAResponse,
  QuestionsRequest,
  NotesRequest,
  ContentResponse,
  RagMetadata,
  RagAuditResponse,
  RagDeleteResponse,
  RagFilters,
  IngestJobResponse,
  DocumentStatusResponse,
  DocumentListResponse,
  ClassLevelsResponse,
} from "@/features/rag/types";

const BASE = "/api/v1/rag";

export const ragApi = {
  getMetadata: () =>
    apiClient.get<RagMetadata>(`${BASE}/metadata`).then((r) => r.data),

  getClassLevels: () =>
    apiClient
      .get<ClassLevelsResponse>(`${BASE}/classes`)
      .then((r) => r.data),

  refreshMetadata: () =>
    apiClient.post(`${BASE}/metadata/refresh`).then((r) => r.data),

  qa: (data: QARequest) =>
    apiClient.post<QAResponse>(`${BASE}/qa`, data).then((r) => r.data),

  generateQuestions: (data: QuestionsRequest) =>
    apiClient
      .post<ContentResponse>(`${BASE}/questions`, data)
      .then((r) => r.data),

  generateNotes: (data: NotesRequest) =>
    apiClient.post<ContentResponse>(`${BASE}/notes`, data).then((r) => r.data),

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

  listDocuments: (params: { limit?: number; offset?: number; status?: string }) =>
    apiClient
      .get<DocumentListResponse>(`${BASE}/documents`, { params })
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
};
