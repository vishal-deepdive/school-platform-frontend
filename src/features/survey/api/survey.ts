import { apiClient } from "@/shared/api/client";
import type {
  SurveyStatusResponse,
  SearchRequest,
  SearchResponse,
  LoadRecentResponse,
  SurveyDeleteResponse,
  ChartsListResponse,
} from "@/features/survey/types";

const BASE = "/api/v1/survey";
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const surveyApi = {
  getStatus: () =>
    apiClient.get<SurveyStatusResponse>(`${BASE}/status`).then((r) => r.data),

  loadRecent: () =>
    apiClient
      .post<LoadRecentResponse>(`${BASE}/load-recent`)
      .then((r) => r.data),

  search: (data: SearchRequest) =>
    apiClient.post<SearchResponse>(`${BASE}/search`, data).then((r) => r.data),

  listCharts: () =>
    apiClient.get<ChartsListResponse>(`${BASE}/charts`).then((r) => r.data),

  getChartUrl: (filename: string) => `${API_BASE}${BASE}/chart/${filename}`,

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

  deleteByClass: (class_name: string, subject_group?: string) =>
    apiClient
      .delete<SurveyDeleteResponse>(`${BASE}/delete/by-class`, {
        data: { class_name, subject_group },
      })
      .then((r) => r.data),
};
