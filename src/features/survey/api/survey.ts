import { apiClient } from "@/shared/api/client";
import { streamSSE } from "@/shared/api/streaming";
import { API_BASE_URL } from "@/shared/config/env";
import { API_V1 } from "@/shared/config/apiVersion";
import type {
  SurveyStatusResponse,
  SurveyAnalyticsResponse,
  SurveyCyclesResponse,
  SurveyThemesResponse,
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
  DetachedResponsesResponse,
  PurgeDetachedResponse,
} from "@/features/survey/types";

const BASE = `${API_V1}/survey`;

/**
 * Single source of truth for the survey feature's react-query keys. The
 * sources list was previously fetched under three different key shapes
 * across SurveySourcePage/SurveyDashboardPage/SheetSelector — three separate
 * cache entries for the same server list, each mounted component fetching
 * its own copy instead of sharing one.
 */
export const surveyKeys = {
  all: ["survey"] as const,
  status: (schoolId?: string | null) => ["survey", "status", schoolId ?? "platform"] as const,
  sources: (schoolId?: string | null) => ["survey", "sources", schoolId ?? "platform"] as const,
  sourceById: (sourceId: string) => ["survey", "source", sourceId] as const,
  syncStatus: (jobId?: string | null) => ["survey", "sync-status", jobId ?? null] as const,
  detached: () => ["survey", "detached"] as const,
};

export const surveyApi = {
  getStatus: (schoolName?: string) =>
    apiClient
      .get<SurveyStatusResponse>(`${BASE}/status`, {
        params: schoolName ? { school_name: schoolName } : undefined,
      })
      .then((r) => r.data),

  /**
   * Feedback satisfaction analytics for the dashboard. Staff are scoped to their
   * own school server-side; admins pass the active school's name to scope to it
   * (omit for cross-school totals). Pass `cycle` to filter to one survey term
   * (omit, or "all", for every cycle combined) — the response always includes a
   * `trend` comparing the two most recent cycles when at least two exist.
   */
  getAnalytics: (schoolName?: string, cycle?: string) =>
    apiClient
      .get<SurveyAnalyticsResponse>(`${BASE}/analytics`, {
        params: {
          ...(schoolName ? { school_name: schoolName } : {}),
          ...(cycle ? { cycle } : {}),
        },
      })
      .then((r) => r.data),

  /** Distinct survey cycles (terms) for the school, oldest first — feeds the cycle selector. */
  getCycles: (schoolName?: string) =>
    apiClient
      .get<SurveyCyclesResponse>(`${BASE}/cycles`, {
        params: schoolName ? { school_name: schoolName } : undefined,
      })
      .then((r) => r.data),

  /**
   * Top recurring feedback themes, clustered from existing feedback embeddings.
   * Cached server-side for ~30 minutes; pass `refresh: true` to force recomputation.
   */
  getThemes: (opts?: { schoolName?: string; sourceIds?: string[]; refresh?: boolean }) =>
    apiClient
      .get<SurveyThemesResponse>(`${BASE}/themes`, {
        params: {
          ...(opts?.schoolName ? { school_name: opts.schoolName } : {}),
          ...(opts?.sourceIds?.length ? { source_ids: opts.sourceIds.join(",") } : {}),
          ...(opts?.refresh ? { refresh: true } : {}),
        },
      })
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

  // ── Detached responses (admin cleanup) ──────────────────────────────────

  getDetachedResponses: () =>
    apiClient
      .get<DetachedResponsesResponse>(`${BASE}/detached`)
      .then((r) => r.data),

  purgeDetachedResponses: (schoolId?: string) =>
    apiClient
      .delete<PurgeDetachedResponse>(`${BASE}/detached`, {
        params: schoolId ? { school_id: schoolId } : undefined,
      })
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
