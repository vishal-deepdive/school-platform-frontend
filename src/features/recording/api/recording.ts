import { isAxiosError } from "axios";
import { multipartClient, apiClient } from "@/shared/api/client";
import { API_V1 } from "@/shared/config/apiVersion";
import type {
  JobResponse,
  JobStatusResponse,
  RecordingsListResponse,
  AuditLogsListResponse,
  DeleteRecordingResponse,
  BulkDeleteResponse,
  SearchResponse,
  MarkdownResult,
  ResultSection,
  RecordingAnalyticsResponse,
} from "@/features/recording/types";
import { buildQueryString, getErrorMessage } from "@/shared/lib/utils";

const BASE = `${API_V1}/recording`;

/**
 * Maps a markdown-endpoint response (or error) to a discriminated state. The
 * endpoints now answer 404 (no result) / 409 (still generating) instead of a
 * 200 carrying an error string, so we must never feed those bodies to the
 * markdown renderer.
 */
async function fetchMarkdown(url: string): Promise<MarkdownResult> {
  try {
    const r = await apiClient.get<string>(url);
    return { state: "ready", markdown: r.data };
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 404) return { state: "not_found" };
      if (err.response?.status === 409) return { state: "generating" };
    }
    return { state: "error", message: getErrorMessage(err) };
  }
}

export const recordingApi = {
  processAudio: (
    file: File,
    params: Record<string, string>,
    onUploadProgress?: (percent: number) => void,
  ) => {
    const form = new FormData();
    form.append("audio_file", file);
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v));
    return multipartClient
      .post<JobResponse>(`${BASE}/process`, form, {
        onUploadProgress: onUploadProgress
          ? (e) => {
              if (e.total) {
                onUploadProgress(Math.round((e.loaded / e.total) * 100));
              }
            }
          : undefined,
      })
      .then((r) => r.data);
  },

  getJobStatus: (jobId: string) =>
    apiClient
      .get<JobStatusResponse>(`${BASE}/status/${jobId}`)
      .then((r) => r.data),

  getResultMarkdown: (jobId: string): Promise<MarkdownResult> =>
    fetchMarkdown(`${BASE}/result/${jobId}/markdown`),

  listRecordings: (params: Record<string, string | number>) =>
    apiClient
      .get<RecordingsListResponse>(
        `${BASE}/recordings${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  /** `rollNo` (parent only) selects which linked child's copy to fetch. */
  getRecordingMarkdown: (recordId: string, rollNo?: string): Promise<MarkdownResult> =>
    fetchMarkdown(
      `${BASE}/recordings/${recordId}/markdown${rollNo ? buildQueryString({ roll_no: rollNo }) : ""}`,
    ),

  deleteRecording: (recordId: string) =>
    apiClient
      .delete<DeleteRecordingResponse>(`${BASE}/recordings/${recordId}`)
      .then((r) => r.data),

  deleteAllRecordings: () =>
    apiClient.delete(`${BASE}/recordings`).then((r) => r.data),

  /** Delete a specific set of recordings (school-scoped per id on the backend). */
  bulkDeleteRecordings: (recordIds: string[]) =>
    apiClient
      .post<BulkDeleteResponse>(`${BASE}/recordings/bulk-delete`, {
        record_ids: recordIds,
      })
      .then((r) => r.data),

  listAuditLogs: (params: Record<string, string | number>) =>
    apiClient
      .get<AuditLogsListResponse>(
        `${BASE}/audit-logs${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  searchRecordings: (params: Record<string, string | number>) =>
    apiClient
      .get<SearchResponse>(
        `${BASE}/recordings/search${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  retryRecording: (recordId: string, params?: Record<string, string>) =>
    apiClient
      .post<JobResponse>(
        `${BASE}/recordings/${recordId}/retry${params ? buildQueryString(params) : ""}`,
      )
      .then((r) => r.data),

  downloadResult: async (jobId: string, format: "md" | "html" | "pdf" = "pdf") => {
    const r = await apiClient.get(
      `${BASE}/result/${jobId}/download?format=${format}`,
      {
        responseType: "blob",
      },
    );
    return r.data;
  },

  getResultSection: (jobId: string, section: ResultSection): Promise<MarkdownResult> =>
    fetchMarkdown(`${BASE}/result/${jobId}/section/${section}`),

  /** Role-scoped recording-activity analytics for the dashboard. */
  getAnalytics: (params: Record<string, string | number> = {}) =>
    apiClient
      .get<RecordingAnalyticsResponse>(`${BASE}/analytics${buildQueryString(params)}`)
      .then((r) => r.data),
};
