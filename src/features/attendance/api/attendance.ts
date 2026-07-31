import { multipartClient, apiClient } from "@/shared/api/client";
import { API_V1 } from "@/shared/config/apiVersion";
import type {
  EnrollResponse,
  MarkAttendanceResponse,
  ManualMarkRequest,
  ManualMarkResponse,
  RosterResponse,
  CorrectAttendanceResponse,
  AttendanceDateResponse,
  AttendanceRangeResponse,
  ChangeLogResponse,
  EnrollmentStatsResponse,
  DeleteResponse,
  UpdateEmbeddingResponse,
  HolidayListResponse,
  HolidayCreateResponse,
  HolidayCreateRequest,
  LeaveListResponse,
  LeaveCreateResponse,
  LeaveCreateRequest,
  LeaveReviewResponse,
  LeaveReviewRequest,
  DashboardResponse,
  AnalyticsResponse,
  MyAnalyticsResponse,
  MyChildrenResponse,
  StudentCalendarResponse,
  ClassCalendarResponse,
} from "@/features/attendance/types";
import { buildQueryString } from "@/shared/lib/utils";

const BASE = `${API_V1}/attendance`;

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

  // Attaches a face to ONE existing roster student, named explicitly by
  // roll_no — no filename convention, so it's the safe path for a single
  // "Add Face" action (e.g. the roster page's per-row button).
  enrollStudentFace: (rollNo: string, files: File[], params: Record<string, string>) => {
    const form = new FormData();
    files.forEach((f) => form.append("photos", f));
    form.append("roll_no", rollNo);
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v));
    return multipartClient
      .post<EnrollResponse>(`${BASE}/enroll-student-face/`, form)
      .then((r) => r.data);
  },

  enrollNewStudentPhotos: (files: File[], params: Record<string, string>) => {
    const form = new FormData();
    files.forEach((f) => form.append("photos", f));
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v));
    return multipartClient
      .post<EnrollResponse>(`${BASE}/enroll-new-student-photos/`, form)
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

  markAttendancePhotos: (files: File[], params: Record<string, string>) => {
    const form = new FormData();
    files.forEach((f) => form.append("photos", f));
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v));
    return multipartClient
      .post<MarkAttendanceResponse>(`${BASE}/mark-attendance-photos/`, form)
      .then((r) => r.data);
  },

  correctAttendance: (params: Record<string, string>) => {
    const form = new FormData();
    Object.entries(params).forEach(([k, v]) => v && form.append(k, v));
    return multipartClient
      .post<CorrectAttendanceResponse>(`${BASE}/correct/`, form)
      .then((r) => r.data);
  },

  getRoster: (params: Record<string, string>) =>
    apiClient
      .get<RosterResponse>(`${BASE}/roster/${buildQueryString(params)}`)
      .then((r) => r.data),

  markManual: (body: ManualMarkRequest) =>
    apiClient
      .post<ManualMarkResponse>(`${BASE}/mark-attendance-manual/`, body)
      .then((r) => r.data),

  getDashboard: (params: Record<string, string>) =>
    apiClient
      .get<DashboardResponse>(`${BASE}/dashboard/${buildQueryString(params)}`)
      .then((r) => r.data),

  getAnalytics: (params: Record<string, string> = {}) =>
    apiClient
      .get<AnalyticsResponse>(`${BASE}/analytics/${buildQueryString(params)}`)
      .then((r) => r.data),

  getMyAnalytics: (params: Record<string, string> = {}) =>
    apiClient
      .get<MyAnalyticsResponse>(`${BASE}/my-analytics/${buildQueryString(params)}`)
      .then((r) => r.data),

  /** Students the caller may view — self (student) or approved children (parent).
   * Backs the parent child-selector on Records + Leave. */
  getMyChildren: () =>
    apiClient
      .get<MyChildrenResponse>(`${BASE}/my-children/`)
      .then((r) => r.data),

  /** Month-aligned attendance calendar for a student (self or approved child). */
  getStudentCalendar: (params: Record<string, string>) =>
    apiClient
      .get<StudentCalendarResponse>(`${BASE}/calendar/${buildQueryString(params)}`)
      .then((r) => r.data),

  /** Month-aligned daily attendance percentage for a class/section (staff). */
  getClassCalendar: (params: Record<string, string>) =>
    apiClient
      .get<ClassCalendarResponse>(`${BASE}/class-calendar/${buildQueryString(params)}`)
      .then((r) => r.data),

  // ── Holidays ──
  listHolidays: (params: Record<string, string>) =>
    apiClient
      .get<HolidayListResponse>(`${BASE}/holidays/${buildQueryString(params)}`)
      .then((r) => r.data),

  addHolidays: (body: HolidayCreateRequest) =>
    apiClient
      .post<HolidayCreateResponse>(`${BASE}/holidays/`, body)
      .then((r) => r.data),

  deleteHoliday: (params: Record<string, string>) =>
    apiClient
      .delete<{ message: string }>(`${BASE}/holidays/${buildQueryString(params)}`)
      .then((r) => r.data),

  // ── Leave ──
  createLeave: (body: LeaveCreateRequest) =>
    apiClient
      .post<LeaveCreateResponse>(`${BASE}/leave/`, body)
      .then((r) => r.data),

  listLeave: (params: Record<string, string>) =>
    apiClient
      .get<LeaveListResponse>(`${BASE}/leave/${buildQueryString(params)}`)
      .then((r) => r.data),

  reviewLeave: (leaveId: number, body: LeaveReviewRequest) =>
    apiClient
      .post<LeaveReviewResponse>(`${BASE}/leave/${leaveId}/review/`, body)
      .then((r) => r.data),

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

  exportAttendanceRange: (params: Record<string, string>) =>
    apiClient
      .get(
        `${BASE}/view-attendance-range/${buildQueryString({ ...params, format: "csv" })}`,
        { responseType: "blob" },
      )
      .then((r) => r.data as Blob),

  getChangeLog: (params: Record<string, string>) =>
    apiClient
      .get<ChangeLogResponse>(
        `${BASE}/database-change-log/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  exportChangeLog: (params: Record<string, string>) =>
    apiClient
      .get(
        `${BASE}/database-change-log/${buildQueryString({ ...params, format: "csv" })}`,
        { responseType: "blob" },
      )
      .then((r) => r.data as Blob),

  deleteStudent: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-student/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  deleteStudentFromDatabase: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-student-from-database/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  deleteStudentFromAttendance: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-student-from-attendance/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  deleteStudentFromBoth: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-student-from-both/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  deleteClass: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-class/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  deleteBulkFromDatabase: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-bulk-from-database/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  deleteBulkFromAttendance: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-bulk-from-attendance/${buildQueryString(params)}`,
      )
      .then((r) => r.data),

  deleteBulkFromBoth: (params: Record<string, string>) =>
    apiClient
      .delete<DeleteResponse>(
        `${BASE}/delete-bulk-from-both/${buildQueryString(params)}`,
      )
      .then((r) => r.data),
};
