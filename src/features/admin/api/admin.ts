import { apiClient, multipartClient } from "@/shared/api/client";
import { API_V1 } from "@/shared/config/apiVersion";
import type {
  AdminUser,
  CreateAdminRequest,
  OnboardingApplicationSummary,
  OnboardingApplicationDetail,
  OnboardingStats,
  ApproveApplicationResponse,
  RejectApplicationRequest,
  RequestChangesRequest,
  SchoolSetupStatus,
  BulkImportResult,
  PlatformOverview,
  SchoolListItem,
  SchoolDetail,
  CreateSchoolRequest,
  ProvisionPrincipalRequest,
  ProvisionedUser,
  ClassCode,
  CreateClassCodeRequest,
  BulkClassCodeRequest,
  TeacherAssignment,
  CreateTeacherAssignmentRequest,
  RagAccessItem,
  PaginatedUsers,
  UserListParams,
  PaginatedAudit,
  AuditLogParams,
} from "@/features/admin/types";

const ADMIN_BASE = `${API_V1}/admin`;
const enc = encodeURIComponent;

export const adminApi = {
  // ── Platform overview (dashboard) ─────────────────────────────────────────

  getPlatformOverview: () =>
    apiClient
      .get<PlatformOverview>(`${ADMIN_BASE}/platform-overview`)
      .then((r) => r.data),

  // ── Admin user management ─────────────────────────────────────────────────

  listAdmins: () =>
    apiClient.get<AdminUser[]>(`${ADMIN_BASE}/admins`).then((r) => r.data),

  createAdmin: (data: CreateAdminRequest) =>
    apiClient.post<AdminUser>(`${ADMIN_BASE}/admins`, data).then((r) => r.data),

  removeAdmin: (userId: string) =>
    apiClient
      .delete<{
        message: string;
      }>(`${ADMIN_BASE}/admins/${encodeURIComponent(userId)}`)
      .then((r) => r.data),

  // ── Onboarding application review ─────────────────────────────────────────

  listApplications: (
    status?: string,
    search?: string,
    limit = 50,
    offset = 0,
    sort: "newest" | "oldest" = "newest",
  ) =>
    apiClient
      .get<OnboardingApplicationSummary[]>(
        `${ADMIN_BASE}/onboarding/applications`,
        {
          params: {
            ...(status ? { status } : {}),
            ...(search ? { search } : {}),
            limit,
            offset,
            sort,
          },
        },
      )
      .then((r) => r.data),

  getOnboardingStats: () =>
    apiClient
      .get<OnboardingStats>(`${ADMIN_BASE}/onboarding/stats`)
      .then((r) => r.data),

  getApplication: (applicationId: string) =>
    apiClient
      .get<OnboardingApplicationDetail>(
        `${ADMIN_BASE}/onboarding/applications/${encodeURIComponent(applicationId)}`,
      )
      .then((r) => r.data),

  approveApplication: (applicationId: string) =>
    apiClient
      .post<ApproveApplicationResponse>(
        `${ADMIN_BASE}/onboarding/applications/${encodeURIComponent(applicationId)}/approve`,
      )
      .then((r) => r.data),

  rejectApplication: (applicationId: string, body: RejectApplicationRequest) =>
    apiClient
      .post<{
        message: string;
      }>(`${ADMIN_BASE}/onboarding/applications/${encodeURIComponent(applicationId)}/reject`, body)
      .then((r) => r.data),

  requestApplicationChanges: (applicationId: string, body: RequestChangesRequest) =>
    apiClient
      .post<{
        message: string;
      }>(`${ADMIN_BASE}/onboarding/applications/${encodeURIComponent(applicationId)}/request-changes`, body)
      .then((r) => r.data),

  // ── Post-approval setup checklist ─────────────────────────────────────────

  getSetupStatus: (schoolId: string) =>
    apiClient
      .get<SchoolSetupStatus>(
        `${ADMIN_BASE}/schools/${encodeURIComponent(schoolId)}/setup-status`,
      )
      .then((r) => r.data),

  // ── Bulk student roster import (CSV) ──────────────────────────────────────

  bulkImportStudents: (schoolId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    return multipartClient
      .post<BulkImportResult>(
        `${ADMIN_BASE}/schools/${encodeURIComponent(schoolId)}/students/bulk`,
        fd,
      )
      .then((r) => r.data);
  },

  // ── Schools management ─────────────────────────────────────────────────────

  listSchools: () =>
    apiClient
      .get<SchoolListItem[]>(`${ADMIN_BASE}/schools-directory`)
      .then((r) => r.data),

  getSchoolDetail: (schoolId: string) =>
    apiClient
      .get<SchoolDetail>(`${ADMIN_BASE}/schools/${enc(schoolId)}`)
      .then((r) => r.data),

  createSchool: (data: CreateSchoolRequest) =>
    apiClient
      .post<{ id: string; name: string }>(`${ADMIN_BASE}/schools`, data)
      .then((r) => r.data),

  setSchoolActive: (schoolId: string, isActive: boolean) =>
    apiClient
      .patch<SchoolDetail>(`${ADMIN_BASE}/schools/${enc(schoolId)}/status`, {
        is_active: isActive,
      })
      .then((r) => r.data),

  setSchoolSession: (schoolId: string, currentSession: string) =>
    apiClient
      .patch<SchoolDetail>(`${ADMIN_BASE}/schools/${enc(schoolId)}/session`, {
        current_session: currentSession,
      })
      .then((r) => r.data),

  provisionPrincipal: (schoolId: string, data: ProvisionPrincipalRequest) =>
    apiClient
      .post<ProvisionedUser>(`${ADMIN_BASE}/schools/${enc(schoolId)}/principal`, data)
      .then((r) => r.data),

  // ── Class codes ────────────────────────────────────────────────────────────

  listClassCodes: (schoolId: string) =>
    apiClient
      .get<ClassCode[]>(`${ADMIN_BASE}/schools/${enc(schoolId)}/class-codes`)
      .then((r) => r.data),

  createClassCode: (schoolId: string, data: CreateClassCodeRequest) =>
    apiClient
      .post<ClassCode>(`${ADMIN_BASE}/schools/${enc(schoolId)}/class-codes`, data)
      .then((r) => r.data),

  bulkCreateClassCodes: (schoolId: string, data: BulkClassCodeRequest) =>
    apiClient
      .post<ClassCode[]>(
        `${ADMIN_BASE}/schools/${enc(schoolId)}/class-codes/bulk`,
        data,
      )
      .then((r) => r.data),

  // ── Teacher class assignments ──────────────────────────────────────────────

  listTeacherAssignments: (schoolId: string) =>
    apiClient
      .get<TeacherAssignment[]>(
        `${ADMIN_BASE}/schools/${enc(schoolId)}/teacher-assignments`,
      )
      .then((r) => r.data),

  assignTeacher: (schoolId: string, data: CreateTeacherAssignmentRequest) =>
    apiClient
      .post<TeacherAssignment>(
        `${ADMIN_BASE}/schools/${enc(schoolId)}/teacher-assignments`,
        data,
      )
      .then((r) => r.data),

  revokeTeacherAssignment: (
    schoolId: string,
    params: { teacher_id: string; class_name: string; section?: string },
  ) =>
    apiClient
      .delete<{ message: string }>(
        `${ADMIN_BASE}/schools/${enc(schoolId)}/teacher-assignments`,
        { params },
      )
      .then((r) => r.data),

  // ── RAG / chatbot access ───────────────────────────────────────────────────

  listRagAccess: (schoolId: string) =>
    apiClient
      .get<RagAccessItem[]>(`${ADMIN_BASE}/schools/${enc(schoolId)}/rag-access`)
      .then((r) => r.data),

  grantRagAccess: (schoolId: string, userId: string) =>
    apiClient
      .post<RagAccessItem>(`${ADMIN_BASE}/schools/${enc(schoolId)}/rag-access`, {
        user_id: userId,
      })
      .then((r) => r.data),

  revokeRagAccess: (schoolId: string, userId: string) =>
    apiClient
      .delete<{
        message: string;
      }>(`${ADMIN_BASE}/schools/${enc(schoolId)}/rag-access/${enc(userId)}`)
      .then((r) => r.data),

  // ── Student roll-number linkage ────────────────────────────────────────────

  assignRollNo: (schoolId: string, studentId: string, rollNo: string) =>
    apiClient
      .post<{
        message: string;
      }>(`${ADMIN_BASE}/schools/${enc(schoolId)}/assign-roll-no`, {
        student_id: studentId,
        roll_no: rollNo,
      })
      .then((r) => r.data),

  // ── User directory ─────────────────────────────────────────────────────────

  listUsers: (params: UserListParams) =>
    apiClient
      .get<PaginatedUsers>(`${ADMIN_BASE}/users`, { params })
      .then((r) => r.data),

  deactivateUser: (userId: string) =>
    apiClient
      .post<{ message: string }>(`${ADMIN_BASE}/users/${enc(userId)}/deactivate`)
      .then((r) => r.data),

  reactivateUser: (userId: string) =>
    apiClient
      .post<{ message: string }>(`${ADMIN_BASE}/users/${enc(userId)}/reactivate`)
      .then((r) => r.data),

  revokeUserSessions: (userId: string) =>
    apiClient
      .post<{
        message: string;
      }>(`${ADMIN_BASE}/users/${enc(userId)}/revoke-sessions`)
      .then((r) => r.data),

  // ── Audit log ──────────────────────────────────────────────────────────────

  listAuditLog: (params: AuditLogParams) =>
    apiClient
      .get<PaginatedAudit>(`${ADMIN_BASE}/audit-log`, { params })
      .then((r) => r.data),

  listAuditActions: () =>
    apiClient
      .get<string[]>(`${ADMIN_BASE}/audit-log/actions`)
      .then((r) => r.data),
};
