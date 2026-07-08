import { apiClient } from "@/shared/api/client";
import { streamSSE } from "@/shared/api/streaming";
import { API_BASE_URL } from "@/shared/config/env";
import { API_V1 } from "@/shared/config/apiVersion";
import type {
  SurveyStatusResponse,
  SurveyAnalyticsResponse,
  SearchRequest,
  SearchResponse,
  SearchStreamEvent,
  LoadRecentResponse,
  SyncJobStatusResponse,
  SurveyDeleteResponse,
  ChartsListResponse,
  SurveySourceResponse,
  SourceListResponse,
  HeaderPreviewResponse,
  RegisterSourceRequest,
  UpdateSourceRequest,
  SurveySourceDeleteResponse,
  SyncMode,
} from "@/features/survey/types";

const BASE = `${API_V1}/survey`;

export const surveyApi = {
  getStatus: () =>
    apiClient.get<SurveyStatusResponse>(`${BASE}/status`).then((r) => r.data),

  /** Feedback satisfaction analytics for the dashboard (staff-scoped). */
  getAnalytics: () =>
    apiClient
      .get<SurveyAnalyticsResponse>(`${BASE}/analytics`)
      .then((r) => r.data),

  // ── Multi-source endpoints ──────────────────────────────────────────────

  getSources: (schoolName?: string) =>
    apiClient
      .get<SourceListResponse>(`${BASE}/sources`, {
        params: schoolName ? { school_name: schoolName } : undefined,
      })
      .then((r) => r.data),

  getSourceById: (sourceId: string) =>
    apiClient
      .get<SurveySourceResponse>(`${BASE}/source/${sourceId}`)
      .then((r) => r.data),

  previewHeaders: (sheetUrl: string) =>
    apiClient
      .post<HeaderPreviewResponse>(`${BASE}/source/preview-headers`, {
        sheet_url: sheetUrl,
      })
      .then((r) => r.data),

  registerSource: (data: RegisterSourceRequest) =>
    apiClient
      .post<SurveySourceResponse>(`${BASE}/source`, data)
      .then((r) => r.data),

  updateSource: (sourceId: string, data: UpdateSourceRequest) =>
    apiClient
      .put<SurveySourceResponse>(`${BASE}/source/${sourceId}`, data)
      .then((r) => r.data),

  syncSource: (sourceId: string, mode: SyncMode = "append") =>
    apiClient
      .post<LoadRecentResponse>(
        `${BASE}/source/${sourceId}/sync`,
        undefined,
        { params: { mode } },
      )
      .then((r) => r.data),

  deleteSourceById: (sourceId: string) =>
    apiClient
      .delete<SurveySourceDeleteResponse>(`${BASE}/source/${sourceId}`)
      .then((r) => r.data),

  // ── Legacy endpoints (kept for backward compat) ────────────────────────

  getSource: (schoolName?: string) =>
    apiClient
      .get<SurveySourceResponse>(`${BASE}/source`, {
        params: schoolName ? { school_name: schoolName } : undefined,
      })
      .then((r) => r.data),

  deleteSource: (schoolName?: string) =>
    apiClient
      .delete<SurveySourceDeleteResponse>(`${BASE}/source`, {
        params: schoolName ? { school_name: schoolName } : undefined,
      })
      .then((r) => r.data),

  loadRecent: (schoolName?: string, mode: SyncMode = "append") =>
    apiClient
      .post<LoadRecentResponse>(`${BASE}/load-recent`, undefined, {
        params: {
          ...(schoolName ? { school_name: schoolName } : {}),
          mode,
        },
      })
      .then((r) => r.data),

  getSyncStatus: (jobId: string) =>
    apiClient
      .get<SyncJobStatusResponse>(`${BASE}/sync-status/${jobId}`)
      .then((r) => r.data),

  // ── Search ─────────────────────────────────────────────────────────────

  search: (data: SearchRequest) =>
    apiClient.post<SearchResponse>(`${BASE}/search`, data).then((r) => r.data),

  searchStream: (data: SearchRequest, signal?: AbortSignal) =>
    streamSSE<SearchStreamEvent>(`${BASE}/search/stream`, data, signal),

  // ── Charts ─────────────────────────────────────────────────────────────

  listCharts: () =>
    apiClient.get<ChartsListResponse>(`${BASE}/charts`).then((r) => r.data),

  getChartUrl: (filename: string) => `${API_BASE_URL}${BASE}/chart/${filename}`,

  resolveChartUrl: (chartUrl: string) =>
    chartUrl.startsWith("http")
      ? chartUrl
      : `${API_BASE_URL}${BASE}/chart/${chartUrl.split("/").pop()}`,

  // ── Delete ─────────────────────────────────────────────────────────────

  deleteByRollSchool: (roll_number: string, school_name: string) =>
    apiClient
      .delete<SurveyDeleteResponse>(`${BASE}/delete/by-roll-school`, {
        data: { roll_number, school_name },
      })
      .then((r) => r.data),

  deleteBySchool: (school_name: string) =>
    apiClient
      .delete<SurveyDeleteResponse>(`${BASE}/delete/by-school`, {
        data: { school_name },
      })
      .then((r) => r.data),

  deleteByClass: (
    class_name: string,
    opts?: { subject_group?: string; school_name?: string },
  ) =>
    apiClient
      .delete<SurveyDeleteResponse>(`${BASE}/delete/by-class`, {
        data: {
          class_name,
          subject_group: opts?.subject_group,
          school_name: opts?.school_name,
        },
      })
      .then((r) => r.data),
};
