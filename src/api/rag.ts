import { apiClient } from './client'
import type {
  QARequest,
  QAResponse,
  QuestionsRequest,
  NotesRequest,
  ContentResponse,
  RagMetadata,
  CascadingFiltersRequest,
  RagAuditResponse,
  RagDeleteResponse,
  RagFilters,
} from '@/types/rag'

const BASE = '/api/v1/rag'

export const ragApi = {
  getMetadata: () =>
    apiClient.get<RagMetadata>(`${BASE}/metadata`).then((r) => r.data),

  refreshMetadata: () =>
    apiClient.post(`${BASE}/metadata/refresh`).then((r) => r.data),

  getCascadingOptions: (data: CascadingFiltersRequest) =>
    apiClient.post<RagMetadata>(`${BASE}/metadata/cascading`, data).then((r) => r.data),

  qa: (data: QARequest) =>
    apiClient.post<QAResponse>(`${BASE}/qa`, data).then((r) => r.data),

  generateQuestions: (data: QuestionsRequest) =>
    apiClient.post<ContentResponse>(`${BASE}/questions`, data).then((r) => r.data),

  generateNotes: (data: NotesRequest) =>
    apiClient.post<ContentResponse>(`${BASE}/notes`, data).then((r) => r.data),

  deleteChunks: (filters: RagFilters) =>
    apiClient.delete<RagDeleteResponse>(`${BASE}/chunks`, { data: filters }).then((r) => r.data),

  deleteAllChunks: () =>
    apiClient.delete<RagDeleteResponse>(`${BASE}/chunks/all`).then((r) => r.data),

  getAudit: () =>
    apiClient.get<RagAuditResponse>(`${BASE}/audit`).then((r) => r.data),
}
