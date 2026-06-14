import { multipartClient, apiClient } from "@/shared/api/client";
import type {
  EnrollResponse,
  MarkAttendanceResponse,
  AttendanceDateResponse,
  AttendanceRangeResponse,
  ChangeLogResponse,
  EnrollmentStatsResponse,
  DeleteResponse,
  UpdateEmbeddingResponse,
} from "@/features/attendance/types";
import { buildQueryString } from "@/shared/lib/utils";

const BASE = "/api/v1/attendance";

export const attendanceApi = {
  enroll: (file: File, params: Record<string, string>) => {
    const form = new FormData();
    form.append("faces_zip", file);
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v));
    return multipartClient
      .post<EnrollResponse>(`${BASE}/enroll/`, form)
      .then((r) => r.data);
  },

  enrollNewStudent: (file: File, params: Record<string, string>) => {
    const form = new FormData();
    form.append("faces_zip", file);
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v));
    return multipartClient
      .post<EnrollResponse>(`${BASE}/enroll-new-student/`, form)
      .then((r) => r.data);
  },

  enrollWithReplacement: (file: File, params: Record<string, string>) => {
    const form = new FormData();
    form.append("faces_zip", file);
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v));
    return multipartClient
      .post<EnrollResponse>(`${BASE}/enroll-new-batch-with-replacement/`, form)
      .then((r) => r.data);
  },

  updateEmbedding: (file: File, params: Record<string, string>) => {
    const form = new FormData();
    form.append("faces_zip", file);
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v));
    return multipartClient
      .post<UpdateEmbeddingResponse>(
        `${BASE}/update-embedding-via-period/`,
        form,
      )
      .then((r) => r.data);
  },

  markAttendance: (file: File, params: Record<string, string>) => {
    const form = new FormData();
    form.append("photos_zip", file);
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v));
    return multipartClient
      .post<MarkAttendanceResponse>(`${BASE}/mark-attendance/`, form)
      .then((r) => r.data);
  },

  getEnrollmentStats: () =>
    apiClient
      .get<EnrollmentStatsResponse>(`${BASE}/enrollment-stats/`)
      .then((r) => r.data),

  viewStudents: (params: Record<string, string>) =>
    apiClient
      .get(`${BASE}/view-students/${buildQueryString(params)}`, {
        responseType: "blob",
      })
      .then((r) => r.data as Blob),

  getAttendanceOnDate: (params: Record<string, string>) =>
    apiClient
      .get<AttendanceDateResponse>(
        `${BASE}/view-attendance-on-date/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  exportAttendanceOnDate: (params: Record<string, string>) =>
    apiClient
      .get(
        `${BASE}/view-attendance-on-date/${buildQueryString({ ...params, format: "csv" })}`,
        { responseType: "blob" },
      )
      .then((r) => r.data as Blob),

  getAttendanceRange: (params: Record<string, string>) =>
    apiClient
      .get<AttendanceRangeResponse>(
        `${BASE}/view-attendance-range/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  getChangeLog: (params: Record<string, string>) =>
    apiClient
      .get<ChangeLogResponse>(
        `${BASE}/database-change-log/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  deleteStudent: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-student/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  deleteClass: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-class/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  deleteBulkFromBoth: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-bulk-from-both/${buildQueryString(params)}`,
      )
      .then((r) => r.data),
};
