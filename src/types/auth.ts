export type UserRole = 'admin' | 'principal' | 'teacher' | 'student' | 'parent' | 'viewer'

export interface User {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  school_id: string | null
  is_active: boolean
  is_email_verified: boolean
  avatar_url: string | null
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface RegisterResponse {
  message: string
  user: User
}

export interface MessageResponse {
  message: string
}

export interface OtpVerifiedResponse {
  message: string
  verified: boolean
}

export type VerifyOtpResponse = OtpVerifiedResponse | TokenResponse | GoogleCompletePendingResponse


export interface GoogleAuthUrlResponse {
  auth_url: string
}

// ── Google OAuth two-phase responses ─────────────────────────────────────────

export interface GoogleTokensIssuedResponse {
  status: 'tokens_issued'
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface GoogleRegistrationRequiredResponse {
  status: 'registration_required'
  google_token: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

export type GoogleCallbackResponse =
  | GoogleTokensIssuedResponse
  | GoogleRegistrationRequiredResponse

// ── Google profile completion ────────────────────────────────────────────────

export interface GoogleCompleteRequest {
  google_token: string
  role: 'student' | 'teacher' | 'parent'
  full_name?: string
  school_id?: string
  class_code?: string
  invite_token?: string
  student_id?: string
  relation?: 'father' | 'mother' | 'guardian' | 'other'
  roll_number?: string
}

export interface GoogleCompletePendingResponse {
  status: 'pending_approval'
  message: string
}

/** Union of what POST /oauth/google/complete can return (201 or 202). */
export type GoogleCompleteResponse = TokenResponse | GoogleCompletePendingResponse

export interface UserResponse {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  school_id: string | null
  account_status: string
  is_active: boolean
  is_email_verified: boolean
  avatar_url: string | null
}

export type OtpPurpose = 'verify_email' | 'reset_password'

export interface RegisterRequest {
  email: string
  password: string
  full_name?: string
  role: UserRole
  school_id?: string
}

export interface StudentRegisterRequest {
  email: string
  password: string
  full_name?: string
  school_id: string
  class_code: string
  roll_number: string
}

export interface TeacherRegisterRequest {
  email: string
  password: string
  full_name?: string
  invite_token: string
}

export interface ParentRegisterRequest {
  email: string
  password: string
  full_name?: string
  school_id: string
  student_id: string
  relation: 'father' | 'mother' | 'guardian' | 'other'
}

export interface LoginRequest {
  email: string
  password: string
}

export interface VerifyOtpRequest {
  email: string
  otp: string
  purpose: OtpPurpose
}

export interface ForgotPasswordRequest {
  email: string
}

export type ResendOtpRequest = ForgotPasswordRequest

export interface ResetPasswordRequest {
  email: string
  otp: string
  new_password: string
}

export interface SchoolSearchItem {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  pin_code: string | null
}

export interface ClassCodeItem {
  code: string
  class_name: string
  section: string | null
}

export interface StudentSearchItem {
  id: string
  full_name: string | null
  roll_number: string | null
}
