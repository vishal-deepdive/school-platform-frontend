export type UserRole =
  | "admin"
  | "principal"
  | "teacher"
  | "student"
  | "parent";

export interface User {
  id: string;
  // Null for guardian (mobile-only) and managed student accounts with no
  // email on file — see the mobile-OTP and admission-number login flows.
  email: string | null;
  // Populated for guardian accounts (their login identifier). Not carried in
  // the JWT — filled in lazily via GET /me where needed (see UserProfileMenu).
  mobile: string | null;
  full_name: string | null;
  role: UserRole;
  school_id: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  avatar_url: string | null;
}

export interface TokenResponse {
  access_token: string;
  // Delivered via HttpOnly cookie, not the body — present only for legacy clients.
  refresh_token?: string;
  token_type: "bearer";
  expires_in: number;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

export interface OtpVerifiedResponse {
  message: string;
  verified: boolean;
  reset_token?: string;
}

export type VerifyOtpResponse =
  | OtpVerifiedResponse
  | TokenResponse
  | GoogleCompletePendingResponse;

export interface GoogleAuthUrlResponse {
  auth_url: string;
}

// ── Google OAuth two-phase responses ─────────────────────────────────────────

export interface GoogleTokensIssuedResponse {
  status: "tokens_issued";
  access_token: string;
  // Delivered via HttpOnly cookie, not the body.
  refresh_token?: string;
  token_type: "bearer";
  expires_in: number;
}

export interface GoogleRegistrationRequiredResponse {
  status: "registration_required";
  google_token: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export type GoogleCallbackResponse =
  | GoogleTokensIssuedResponse
  | GoogleRegistrationRequiredResponse;

// ── Google profile completion ────────────────────────────────────────────────
// Teacher / co-principal invite claim only — students and parents don't
// self-register (see StudentAdmissionLoginRequest / MobileOtp*Request below).

export interface GoogleCompleteRequest {
  google_token: string;
  full_name?: string;
  invite_token: string;
}

export interface GoogleCompletePendingResponse {
  status: "pending_approval";
  message: string;
}

/** Union of what POST /oauth/google/complete can return (201 or 202). */
export type GoogleCompleteResponse =
  | TokenResponse
  | GoogleCompletePendingResponse;

export interface UserResponse {
  id: string;
  // Null for guardian (mobile-only) and managed student accounts with no
  // email on file — see `mobile`.
  email: string | null;
  mobile: string | null;
  full_name: string | null;
  role: UserRole;
  school_id: string | null;
  account_status: string;
  is_active: boolean;
  is_email_verified: boolean;
  avatar_url: string | null;
}

export type OtpPurpose = "verify_email" | "reset_password";

export interface TeacherRegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  invite_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ── Guardian mobile+OTP login ─────────────────────────────────────────────────

export interface MobileOtpRequestRequest {
  mobile: string;
}

export interface MobileOtpLoginVerifyRequest {
  mobile: string;
  otp: string;
}

// ── Student admission-number login ────────────────────────────────────────────

export interface StudentAdmissionLoginRequest {
  school_code: string;
  roll_no: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
  purpose: OtpPurpose;
}

export interface ForgotPasswordRequest {
  email: string;
}

export type ResendOtpRequest = ForgotPasswordRequest;

export interface ResetPasswordRequest {
  reset_token: string;
  new_password: string;
}

export interface SchoolSearchItem {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
}

export interface ClassCodeItem {
  code: string;
  class_name: string;
  section: string | null;
}

export interface PendingParentItem {
  parent_id: string;
  parent_email: string;
  parent_name: string | null;
  relation: string;
  requested_at: string | null;
  student_id: string;
  student_name: string | null;
  student_roll_no: string | null;
}

export interface PendingParentsResponse {
  items: PendingParentItem[];
  total: number;
}
