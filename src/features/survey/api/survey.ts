import { apiClient } from "@/shared/api/client";
import { API_BASE_URL } from "@/shared/config/env";
import type {
  SurveyStatusResponse,
  SearchRequest,
  SearchResponse,
  LoadRecentResponse,
  SyncJobStatusResponse,
  SurveyDeleteResponse,
  ChartsListResponse,
} from "@/features/survey/types";

const BASE = "/api/v1/survey";

export const surveyApi = {
  getStatus: () =>
    apiClient.get<SurveyStatusResponse>(`${BASE}/status`).then((r) => r.data),

  loadRecent: () =>
    apiClient
      .post<LoadRecentResponse>(`${BASE}/load-recent`)
      .then((r) => r.data),

  getSyncStatus: (jobId: string) =>
    apiClient
      .get<SyncJobStatusResponse>(`${BASE}/sync-status/${jobId}`)
      .then((r) => r.data),

  search: (data: SearchRequest) =>
    apiClient.post<SearchResponse>(`${BASE}/search`, data).then((r) => r.data),

  listCharts: () =>
    apiClient.get<ChartsListResponse>(`${BASE}/charts`).then((r) => r.data),

  getChartUrl: (filename: string) => `${API_BASE_URL}${BASE}/chart/${filename}`,

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
