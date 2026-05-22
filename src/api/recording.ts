import { multipartClient, apiClient } from './client'
import type {
  JobResponse,
  JobStatusResponse,
  RecordingsListResponse,
  AuditLogsListResponse,
  DeleteRecordingResponse,
} from '@/types/recording'
import { buildQueryString } from '@/lib/utils'

const BASE = '/api/v1/recording'

export const recordingApi = {
  processAudio: (file: File, params: Record<string, string>) => {
    const form = new FormData()
    form.append('audio_file', file)
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v))
    return multipartClient.post<JobResponse>(`${BASE}/process`, form).then((r) => r.data)
  },

  getJobStatus: (jobId: string) =>
    apiClient.get<JobStatusResponse>(`${BASE}/status/${jobId}`).then((r) => r.data),

  getResultMarkdown: (jobId: string) =>
    apiClient.get<string>(`${BASE}/result/${jobId}/markdown`).then((r) => r.data),

  listRecordings: (params: Record<string, string | number>) =>
    apiClient
      .get<RecordingsListResponse>(`${BASE}/recordings${buildQueryString(params)}`)
      .then((r) => r.data),

  getRecordingMarkdown: (recordId: string) =>
    apiClient.get<string>(`${BASE}/recordings/${recordId}/markdown`).then((r) => r.data),

  deleteRecording: (recordId: string) =>
    apiClient
      .delete<DeleteRecordingResponse>(`${BASE}/recordings/${recordId}`)
      .then((r) => r.data),

  deleteAllRecordings: () =>
    apiClient.delete(`${BASE}/recordings`).then((r) => r.data),

  listAuditLogs: (params: Record<string, string | number>) =>
    apiClient
      .get<AuditLogsListResponse>(`${BASE}/audit-logs${buildQueryString(params)}`)
      .then((r) => r.data),
}
