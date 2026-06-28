import { apiClient } from "@/shared/api/client";
import type {
  LoginRequest,
  RegisterRequest,
  StudentRegisterRequest,
  TeacherRegisterRequest,
  ParentRegisterRequest,
  TokenResponse,
  RegisterResponse,
  MessageResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ResendOtpRequest,
  GoogleAuthUrlResponse,
  GoogleCallbackResponse,
  GoogleCompleteRequest,
  GoogleCompleteResponse,
  UserResponse,
  SchoolSearchItem,
  ClassCodeItem,
  StudentSearchItem,
  PendingParentsResponse,
} from "@/features/auth/types";

const BASE = "/api/v1/auth";

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient
      .post<RegisterResponse>(`${BASE}/register`, data)
      .then((r) => r.data),

  registerStudent: (data: StudentRegisterRequest) =>
    apiClient
      .post<RegisterResponse>(`${BASE}/register`, data)
      .then((r) => r.data),

  registerTeacher: (data: TeacherRegisterRequest) =>
    apiClient
      .post<RegisterResponse>(`${BASE}/register/teacher`, data)
      .then((r) => r.data),

  registerParent: (data: ParentRegisterRequest) =>
    apiClient
      .post<RegisterResponse>(`${BASE}/register/parent`, data)
      .then((r) => r.data),

  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>(`${BASE}/login`, data).then((r) => r.data),

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

  resendOtp: (data: ResendOtpRequest) =>
    apiClient
      .post<MessageResponse>(`${BASE}/resend-otp`, data)
      .then((r) => r.data),

  refresh: (refresh_token: string) =>
    apiClient
      .post<TokenResponse>(`${BASE}/refresh`, { refresh_token })
      .then((r) => r.data),

  logout: (refresh_token: string) =>
    apiClient
      .post<MessageResponse>(`${BASE}/logout`, { refresh_token })
      .then((r) => r.data),

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

  searchStudentsByRoll: (school_id: string, roll_number: string) =>
    apiClient
      .get<
        StudentSearchItem[]
      >(`${BASE}/schools/${school_id}/students`, { params: { roll_number } })
      .then((r) => r.data),

  // ── Parent approval (principal / admin) ──────────────────────────────────
  getPendingParents: () =>
    apiClient
      .get<PendingParentsResponse>(`${BASE}/parents/pending`)
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
