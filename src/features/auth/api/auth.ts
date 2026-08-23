import { apiClient } from "@/shared/api/client";
import { API_V1 } from "@/shared/config/apiVersion";
import type {
  LoginRequest,
  TeacherRegisterRequest,
  TokenResponse,
  RegisterResponse,
  MessageResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  ResendOtpRequest,
  GoogleAuthUrlResponse,
  GoogleCallbackResponse,
  GoogleCompleteRequest,
  GoogleCompleteResponse,
  UserResponse,
  SchoolSearchItem,
  ClassCodeItem,
  PendingParentsResponse,
  MobileOtpRequestRequest,
  MobileOtpLoginVerifyRequest,
  StudentAdmissionLoginRequest,
} from "@/features/auth/types";

const BASE = `${API_V1}/auth`;

export interface CreateInviteResult {
  invite_id: string;
  role: string;
  /** Present only for shareable (no-email) invites; null when the link was emailed. */
  invite_token: string | null;
  /** Present only for shareable (no-email) invites; null when the link was emailed. */
  invite_url: string | null;
  email: string | null;
  expires_at: string;
}

export interface PendingInvite {
  invite_id: string;
  school_id: string;
  role: string;
  email: string | null;
  invited_by_email: string | null;
  invited_by_name: string | null;
  expires_at: string | null;
  created_at: string | null;
  last_sent_at: string | null;
}

/** Token-gated context for the invite-claim page (school, role, bound email). */
export interface InvitePreview {
  role: string;
  school_name: string;
  email: string | null;
  expires_at: string | null;
}

export interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  account_status: string;
  is_email_verified: boolean;
  avatar_url: string | null;
  created_at: string | null;
}

export const authApi = {
  /**
   * Create a time-limited invite for a teacher or co-principal. The school is
   * derived from the caller's JWT. Requires a principal/admin session.
   */
  createInvite: (data: {
    email?: string;
    role: "teacher" | "principal";
    expires_hours?: number;
    /** Admins only — target school. Ignored for principals (own school). */
    school_id?: string;
  }) =>
    apiClient
      .post<CreateInviteResult>(`${BASE}/invite`, data)
      .then((r) => r.data),

  /** List pending (unused, unexpired) invites for a school. Admins pass the id. */
  listInvites: (schoolId: string) =>
    apiClient
      .get<PendingInvite[]>(`${BASE}/invites`, { params: { school_id: schoolId } })
      .then((r) => r.data),

  /** Re-issue a pending invite with a fresh token + expiry (old link stops working). */
  resendInvite: (invitationId: string) =>
    apiClient
      .post<CreateInviteResult>(`${BASE}/invites/${encodeURIComponent(invitationId)}/resend`)
      .then((r) => r.data),

  /** Revoke a pending invite so its link can no longer be used. */
  revokeInvite: (invitationId: string) =>
    apiClient
      .delete<MessageResponse>(`${BASE}/invites/${encodeURIComponent(invitationId)}`)
      .then((r) => r.data),

  /**
   * Public: resolve a raw invite token to the school/role/bound-email so the
   * registration page can pre-fill and confirm the invite before submit.
   */
  previewInvite: (token: string) =>
    apiClient
      .get<InvitePreview>(`${BASE}/invite/preview`, { params: { token } })
      .then((r) => r.data),

  /** List active teaching staff for a school. Admins pass the id; principals omit it. */
  listStaff: (schoolId?: string) =>
    apiClient
      .get<StaffMember[]>(`${BASE}/staff`, {
        params: schoolId ? { school_id: schoolId } : undefined,
      })
      .then((r) => r.data),

  registerTeacher: (data: TeacherRegisterRequest) =>
    apiClient
      .post<RegisterResponse>(`${BASE}/register/teacher`, data)
      .then((r) => r.data),

  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>(`${BASE}/login`, data).then((r) => r.data),

  /** Guardian login step 1 — send a login OTP to a registered mobile number. */
  requestMobileOtp: (data: MobileOtpRequestRequest) =>
    apiClient
      .post<MessageResponse>(`${BASE}/login/mobile/request-otp`, data)
      .then((r) => r.data),

  /** Guardian login step 2 — verify the OTP and receive a session. */
  verifyMobileOtp: (data: MobileOtpLoginVerifyRequest) =>
    apiClient
      .post<TokenResponse>(`${BASE}/login/mobile/verify`, data)
      .then((r) => r.data),

  /** Student login — school code + admission (roll) number + password. */
  loginStudent: (data: StudentAdmissionLoginRequest) =>
    apiClient
      .post<TokenResponse>(`${BASE}/login/student`, data)
      .then((r) => r.data),

  verifyOtp: (data: VerifyOtpRequest) =>
    apiClient
      .post<VerifyOtpResponse>(`${BASE}/verify-otp`, data, {
        validateStatus: (status) => status >= 200 && status < 300,
      })
      .then((r) => r.data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient
      .post<MessageResponse>(`${BASE}/forgot-password`, data)
      .then((r) => r.data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient
      .post<MessageResponse>(`${BASE}/reset-password`, data)
      .then((r) => r.data),

  /** Self-service change for an already-authenticated user (requires current_password). */
  changePassword: (data: ChangePasswordRequest) =>
    apiClient
      .post<TokenResponse>(`${BASE}/change-password`, data)
      .then((r) => r.data),

  resendOtp: (data: ResendOtpRequest) =>
    apiClient
      .post<MessageResponse>(`${BASE}/resend-otp`, data)
      .then((r) => r.data),

  /** Rotate tokens. The refresh token travels via the HttpOnly cookie. */
  refresh: () =>
    apiClient.post<TokenResponse>(`${BASE}/refresh`, {}).then((r) => r.data),

  /** Revoke the current session. The refresh token travels via the cookie. */
  logout: () =>
    apiClient.post<MessageResponse>(`${BASE}/logout`, {}).then((r) => r.data),

  /** Fetch the current user's profile (requires Bearer token). */
  me: () => apiClient.get<UserResponse>(`${BASE}/me`).then((r) => r.data),

  googleLogin: () =>
    apiClient
      .get<GoogleAuthUrlResponse>(`${BASE}/oauth/google`, {
        params: { t: Date.now() },
        // The server sets an HttpOnly state-binding cookie (CSRF defence) on this
        // response; withCredentials lets the browser store and later return it.
        withCredentials: true,
      })
      .then((r) => r.data),

  /** Phase 1 — may return tokens (existing user) OR a signup token (new user). */
  googleCallback: (code: string, state: string) =>
    apiClient
      .get<GoogleCallbackResponse>(`${BASE}/oauth/google/callback`, {
        params: { code, state },
        // Send the state-binding cookie set during googleLogin so the backend
        // can verify this is the same browser that initiated the flow.
        withCredentials: true,
      })
      .then((r) => r.data),

  /**
   * Phase 2 — completes registration for new Google users.
   * Returns TokenResponse (201) for student/teacher, or GoogleCompletePendingResponse (202) for parent.
   */
  googleCompleteRegistration: (data: GoogleCompleteRequest) =>
    apiClient
      .post<GoogleCompleteResponse>(`${BASE}/oauth/google/complete`, data, {
        // Axios throws on non-2xx by default; 202 is fine — prevent it from being
        // treated as an error when the parent pending response is returned.
        validateStatus: (status) => status >= 200 && status < 300,
      })
      .then((r) => r.data),

  searchSchools: (q: string) =>
    apiClient
      .get<SchoolSearchItem[]>(`${BASE}/schools/search`, { params: { q } })
      .then((r) => r.data),

  getSchoolClasses: (school_id: string) =>
    apiClient
      .get<ClassCodeItem[]>(`${BASE}/schools/${school_id}/classes`)
      .then((r) => r.data),

  // ── Parent approval (principal / admin) ──────────────────────────────────
  /** List pending parents. Admins pass schoolId to scope to one school; principals ignore it (own school always). */
  getPendingParents: (schoolId?: string) =>
    apiClient
      .get<PendingParentsResponse>(`${BASE}/parents/pending`, {
        params: schoolId ? { school_id: schoolId } : undefined,
      })
      .then((r) => r.data),

  approveParent: (userId: string) =>
    apiClient
      .post<MessageResponse>(`${BASE}/parents/${userId}/approve`)
      .then((r) => r.data),

  rejectParent: (userId: string) =>
    apiClient
      .post<MessageResponse>(`${BASE}/parents/${userId}/reject`)
      .then((r) => r.data),
};
