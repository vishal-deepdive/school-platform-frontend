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

export interface GoogleAuthUrlResponse {
  auth_url: string
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

export interface ResetPasswordRequest {
  email: string
  otp: string
  new_password: string
}
