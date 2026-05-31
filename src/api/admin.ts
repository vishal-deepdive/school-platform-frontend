import { apiClient } from './client'
import type {
  AdminUser,
  CreateAdminRequest,
  OnboardingApplicationSummary,
  OnboardingApplicationDetail,
  ApproveApplicationResponse,
  RejectApplicationRequest,
} from '@/types/admin'

const ADMIN_BASE = '/api/v1/admin'

export const adminApi = {
  // ── Admin user management ─────────────────────────────────────────────────

  listAdmins: () =>
    apiClient
      .get<AdminUser[]>(`${ADMIN_BASE}/admins`)
      .then((r) => r.data),

  createAdmin: (data: CreateAdminRequest) =>
    apiClient
      .post<AdminUser>(`${ADMIN_BASE}/admins`, data)
      .then((r) => r.data),

  removeAdmin: (userId: string) =>
    apiClient
      .delete<{ message: string }>(`${ADMIN_BASE}/admins/${encodeURIComponent(userId)}`)
      .then((r) => r.data),

  // ── Onboarding application review ─────────────────────────────────────────

  listApplications: (status?: string, search?: string, limit = 50, offset = 0) =>
    apiClient
      .get<OnboardingApplicationSummary[]>(`${ADMIN_BASE}/onboarding/applications`, {
        params: { ...(status ? { status } : {}), ...(search ? { search } : {}), limit, offset },
      })
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
      .post<{ message: string }>(
        `${ADMIN_BASE}/onboarding/applications/${encodeURIComponent(applicationId)}/reject`,
        body,
      )
      .then((r) => r.data),
}
