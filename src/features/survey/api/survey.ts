import { apiClient } from "@/shared/api/client";
import { streamSSE } from "@/shared/api/streaming";
import { API_BASE_URL } from "@/shared/config/env";
import type {
  SurveyStatusResponse,
  SearchRequest,
  SearchResponse,
  SearchStreamEvent,
  LoadRecentResponse,
  SyncJobStatusResponse,
  SurveyDeleteResponse,
  ChartsListResponse,
  SurveySourceResponse,
  RegisterSourceRequest,
  SurveySourceDeleteResponse,
  SyncMode,
} from "@/features/survey/types";

const BASE = "/api/v1/survey";

export const surveyApi = {
  getStatus: () =>
    apiClient.get<SurveyStatusResponse>(`${BASE}/status`).then((r) => r.data),

  // schoolName is required only for admins (the school whose registered sheet
  // to sync); principals omit it and sync their own school. mode "replace" first
  // clears the school's rows for the source's cycle, then re-imports.
  loadRecent: (schoolName?: string, mode: SyncMode = "append") =>
    apiClient
      .post<LoadRecentResponse>(`${BASE}/load-recent`, undefined, {
        params: {
          ...(schoolName ? { school_name: schoolName } : {}),
          mode,
        },
      })
      .then((r) => r.data),

  // schoolName lets an admin target a specific school's source; principals omit it.
  getSource: (schoolName?: string) =>
    apiClient
      .get<SurveySourceResponse>(`${BASE}/source`, {
        params: schoolName ? { school_name: schoolName } : undefined,
      })
      .then((r) => r.data),

  registerSource: (data: RegisterSourceRequest) =>
    apiClient
      .post<SurveySourceResponse>(`${BASE}/source`, data)
      .then((r) => r.data),

  deleteSource: (schoolName?: string) =>
    apiClient
      .delete<SurveySourceDeleteResponse>(`${BASE}/source`, {
        params: schoolName ? { school_name: schoolName } : undefined,
      })
      .then((r) => r.data),

  getSyncStatus: (jobId: string) =>
    apiClient
      .get<SyncJobStatusResponse>(`${BASE}/sync-status/${jobId}`)
      .then((r) => r.data),

  search: (data: SearchRequest) =>
    apiClient.post<SearchResponse>(`${BASE}/search`, data).then((r) => r.data),

  searchStream: (data: SearchRequest, signal?: AbortSignal) =>
    streamSSE<SearchStreamEvent>(`${BASE}/search/stream`, data, signal),

  listCharts: () =>
    apiClient.get<ChartsListResponse>(`${BASE}/charts`).then((r) => r.data),

  getChartUrl: (filename: string) => `${API_BASE_URL}${BASE}/chart/${filename}`,

  resolveChartUrl: (chartUrl: string) =>
    chartUrl.startsWith("http") ? chartUrl : `${API_BASE_URL}${BASE}/chart/${chartUrl.split("/").pop()}`,

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
