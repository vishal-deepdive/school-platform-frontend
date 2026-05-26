import { z } from 'zod'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-=_+\[\]{};:'",.<>/?\\|`~]).{8,128}$/

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required').max(128),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      PASSWORD_REGEX,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
  confirm_password: z.string(),
  full_name: z.string().max(255).optional(),
  role: z.enum(['admin', 'teacher', 'viewer']),
  school_id: z.string().uuid('Invalid school ID').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const studentRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      PASSWORD_REGEX,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
  confirm_password: z.string(),
  full_name: z.string().max(255).optional(),
  school_id: z.string().uuid('Invalid school ID'),
  class_code: z.string().min(1, 'Class code is required').max(16),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const teacherRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      PASSWORD_REGEX,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
  confirm_password: z.string(),
  full_name: z.string().max(255).optional(),
  invite_token: z
    .string()
    .length(64, 'Invite token must be exactly 64 characters')
    .regex(/^[0-9a-f]{64}$/, 'Invite token must be a valid 64-character hex string'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const parentRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      PASSWORD_REGEX,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
  confirm_password: z.string(),
  full_name: z.string().max(255).optional(),
  school_id: z.string().uuid('Invalid school ID'),
  student_id: z.string().uuid('Invalid student ID'),
  relation: z.enum(['father', 'mother', 'guardian', 'other']),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  purpose: z.enum(['verify_email', 'reset_password']),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      PASSWORD_REGEX,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const markAttendanceSchema = z.object({
  school_name: z.string().min(1, 'School name is required'),
  class_name: z.string().min(1, 'Class is required'),
  section: z.string().min(1, 'Section is required'),
  subject: z.string().optional(),
  threshold: z.number().min(0).max(1).default(0.3),
  session: z.string().optional(),
})

export const enrollSchema = z.object({
  school_name: z.string().min(1, 'School name is required'),
  session: z.string().min(1, 'Session is required'),
  class_name: z.string().optional(),
  section: z.string().optional(),
  subject: z.string().optional(),
})

export const qaSchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000),
})

export const surveySearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000),
  feedback_column: z.enum(['teacher_feedback', 'school_feedback', 'school_suggestions']),
  limit: z.number().min(1).max(100).default(10),
})

// ── Google OAuth profile completion ──────────────────────────────────────────

export const googleCompleteStudentSchema = z.object({
  full_name: z.string().max(255).optional(),
  school_id: z.string().uuid('Invalid school ID'),
  class_code: z.string().min(1, 'Class code is required').max(16),
})

export const googleCompleteTeacherSchema = z.object({
  full_name: z.string().max(255).optional(),
  invite_token: z
    .string()
    .length(64, 'Invite token must be exactly 64 characters')
    .regex(/^[0-9a-f]{64}$/, 'Invite token must be a valid 64-character hex string'),
})

export const googleCompleteParentSchema = z.object({
  full_name: z.string().max(255).optional(),
  school_id: z.string().uuid('Invalid school ID'),
  student_id: z.string().uuid('Invalid student ID'),
  relation: z.enum(['father', 'mother', 'guardian', 'other']),
})

export type GoogleCompleteStudentFormData = z.infer<typeof googleCompleteStudentSchema>
export type GoogleCompleteTeacherFormData = z.infer<typeof googleCompleteTeacherSchema>
export type GoogleCompleteParentFormData = z.infer<typeof googleCompleteParentSchema>

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type StudentRegisterFormData = z.infer<typeof studentRegisterSchema>
export type TeacherRegisterFormData = z.infer<typeof teacherRegisterSchema>
export type ParentRegisterFormData = z.infer<typeof parentRegisterSchema>
export type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type MarkAttendanceFormData = z.infer<typeof markAttendanceSchema>
export type EnrollFormData = z.infer<typeof enrollSchema>
export type QAFormData = z.infer<typeof qaSchema>
export type SurveySearchFormData = z.infer<typeof surveySearchSchema>
