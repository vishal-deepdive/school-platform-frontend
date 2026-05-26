import { apiClient } from './client'
import type {
  LoginRequest,
  RegisterRequest,
  StudentRegisterRequest,
  TeacherRegisterRequest,
  ParentRegisterRequest,
  TokenResponse,
  RegisterResponse,
  MessageResponse,
  OtpVerifiedResponse,
  VerifyOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ResendOtpRequest,
  GoogleAuthUrlResponse,
  GoogleCallbackResponse,
  GoogleCompleteRequest,
  GoogleCompleteResponse,
  UserResponse,
} from '@/types/auth'

const BASE = '/api/v1/auth'

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<RegisterResponse>(`${BASE}/register`, data).then((r) => r.data),

  registerStudent: (data: StudentRegisterRequest) =>
    apiClient.post<RegisterResponse>(`${BASE}/register`, data).then((r) => r.data),

  registerTeacher: (data: TeacherRegisterRequest) =>
    apiClient.post<RegisterResponse>(`${BASE}/register/teacher`, data).then((r) => r.data),

  registerParent: (data: ParentRegisterRequest) =>
    apiClient.post<RegisterResponse>(`${BASE}/register/parent`, data).then((r) => r.data),

  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>(`${BASE}/login`, data).then((r) => r.data),

  verifyOtp: (data: VerifyOtpRequest) =>
    apiClient.post<OtpVerifiedResponse>(`${BASE}/verify-otp`, data).then((r) => r.data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<MessageResponse>(`${BASE}/forgot-password`, data).then((r) => r.data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<MessageResponse>(`${BASE}/reset-password`, data).then((r) => r.data),

  resendOtp: (data: ResendOtpRequest) =>
    apiClient.post<MessageResponse>(`${BASE}/resend-otp`, data).then((r) => r.data),

  refresh: (refresh_token: string) =>
    apiClient.post<TokenResponse>(`${BASE}/refresh`, { refresh_token }).then((r) => r.data),

  logout: (refresh_token: string) =>
    apiClient.post<MessageResponse>(`${BASE}/logout`, { refresh_token }).then((r) => r.data),

  /** Fetch the current user's profile (requires Bearer token). */
  me: () =>
    apiClient.get<UserResponse>(`${BASE}/me`).then((r) => r.data),

  googleLogin: () =>
    apiClient.get<GoogleAuthUrlResponse>(`${BASE}/oauth/google`, { params: { t: Date.now() } }).then((r) => r.data),

  /** Phase 1 — may return tokens (existing user) OR a signup token (new user). */
  googleCallback: (code: string, state: string) =>
    apiClient
      .get<GoogleCallbackResponse>(`${BASE}/oauth/google/callback`, { params: { code, state } })
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
}
