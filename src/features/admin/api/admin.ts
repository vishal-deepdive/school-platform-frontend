import { apiClient, multipartClient } from "@/shared/api/client";
import type {
  AdminUser,
  CreateAdminRequest,
  OnboardingApplicationSummary,
  OnboardingApplicationDetail,
  ApproveApplicationResponse,
  RejectApplicationRequest,
  RequestChangesRequest,
  SchoolSetupStatus,
  BulkImportResult,
  PlatformOverview,
} from "@/features/admin/types";

const ADMIN_BASE = "/api/v1/admin";

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
          },
        },
      )
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
};
