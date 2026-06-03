import { z } from 'zod'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Preprocessor for optional text fields: trims whitespace and converts an
 * empty (or whitespace-only) string to `undefined` so downstream `.optional()`
 * sees it as absent rather than as an empty value.
 */
const preprocessOptional = (v: unknown): unknown => {
  if (typeof v !== 'string') return v
  const trimmed = v.trim()
  return trimmed === '' ? undefined : trimmed
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-=_+\[\]{};:'",.<>/?\\|`~]).{8,128}$/

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number, and special character')

/** Trims whitespace and normalises to lowercase before validating e-mail format. */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')

export const inviteTokenField = z
  .string()
  .length(8, 'Invite code must be exactly 8 characters')
  .regex(/^[A-Za-z2-9]{8}$/, 'Invite code must contain only letters and digits 2–9')

/** Returns true when a string matches the invite token format (8 chars: letters + digits 2–9). */
export function isValidInviteToken(token: string): boolean {
  return /^[A-Za-z2-9]{8}$/.test(token)
}

export const otpField = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must be numeric')

/** Reusable terms-acceptance field for all registration forms. */
export const termsField = z
  .boolean()
  .refine((v) => v === true, 'You must accept the terms and conditions')

/**
 * Optional name/text field: trims surrounding whitespace and treats an
 * empty or whitespace-only value as absent (undefined), not as an empty string.
 */
export const optionalNameField = z.preprocess(
  preprocessOptional,
  z.string().min(1, 'Cannot be blank').max(255, 'Too long').optional(),
)

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    emailField,
  password: z.string().min(1, 'Password is required').max(128),
})

export const registerSchema = z
  .object({
    email:            emailField,
    password:         passwordField,
    confirm_password: z.string(),
    full_name:        optionalNameField,
    role:             z.enum(['admin', 'teacher', 'viewer']),
    school_id:        z.string().uuid('Invalid school ID').optional().or(z.literal('')),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const studentRegisterSchema = z
  .object({
    email:            emailField,
    password:         passwordField,
    confirm_password: z.string(),
    full_name:        optionalNameField,
    school_id:        z.string().uuid('Invalid school ID'),
    class_code:       z.string().trim().min(1, 'Class code is required').max(16),
    roll_number:      z.string().trim().min(1, 'Roll number is required').max(50),
    terms:            termsField,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const teacherRegisterSchema = z
  .object({
    email:            emailField,
    password:         passwordField,
    confirm_password: z.string(),
    full_name:        optionalNameField,
    invite_token:     inviteTokenField,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

/**
 * Teacher registration via invite link — invite_token comes from the URL,
 * not from the form, so it is injected at submit time.
 */
export const teacherInviteFormSchema = z
  .object({
    email:            emailField,
    password:         passwordField,
    confirm_password: z.string(),
    full_name:        optionalNameField,
    terms:            termsField,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const parentRegisterSchema = z
  .object({
    email:            emailField,
    password:         passwordField,
    confirm_password: z.string(),
    full_name:        optionalNameField,
    school_id:        z.string().uuid('Invalid school ID'),
    student_id:       z.string().uuid('Invalid student ID'),
    relation:         z.enum(['father', 'mother', 'guardian', 'other']),
    terms:            termsField,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const verifyOtpSchema = z.object({
  email:   emailField,
  otp:     otpField,
  purpose: z.enum(['verify_email', 'reset_password']),
})

export const forgotPasswordSchema = z.object({
  email: emailField,
})

export const resetPasswordSchema = z
  .object({
    email:            emailField,
    otp:              otpField,
    new_password:     passwordField,
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

// ─── Feature schemas ──────────────────────────────────────────────────────────

export const markAttendanceSchema = z.object({
  school_name: z.string().min(1, 'School name is required'),
  class_name:  z.string().min(1, 'Class is required'),
  section:     z.string().min(1, 'Section is required'),
  subject:     z.string().optional(),
  threshold:   z.number().min(0).max(1).default(0.3),
  session:     z.string().optional(),
})

export const enrollSchema = z.object({
  school_name: z.string().min(1, 'School name is required'),
  session:     z.string().min(1, 'Session is required'),
  class_name:  z.string().optional(),
  section:     z.string().optional(),
  subject:     z.string().optional(),
})

export const qaSchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000),
})

export const surveySearchSchema = z.object({
  query:           z.string().min(1, 'Query is required').max(2000),
  feedback_column: z.enum(['teacher_feedback', 'school_feedback', 'school_suggestions']),
  limit:           z.number().min(1).max(100).default(10),
})

// ─── Google OAuth completion ──────────────────────────────────────────────────

export const googleCompleteStudentSchema = z.object({
  full_name:   optionalNameField,
  school_id:   z.string().uuid('Invalid school ID'),
  class_code:  z.string().trim().min(1, 'Class code is required').max(16),
  roll_number: z.string().trim().min(1, 'Roll number is required').max(50),
})

export const googleCompleteTeacherSchema = z.object({
  full_name:    optionalNameField,
  invite_token: inviteTokenField,
})

/** Teacher-via-invite OAuth completion — token comes from sessionStorage, not the form. */
export const googleCompleteTeacherInviteSchema = z.object({
  full_name: optionalNameField,
})

export const googleCompleteParentSchema = z.object({
  full_name:  optionalNameField,
  school_id:  z.string().uuid('Invalid school ID'),
  student_id: z.string().uuid('Invalid student ID'),
  relation:   z.enum(['father', 'mother', 'guardian', 'other']),
})

// ─── School Onboarding Wizard ─────────────────────────────────────────────────

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const

export const SCHOOL_BOARDS = [
  { value: 'CBSE',      label: 'CBSE – Central Board of Secondary Education' },
  { value: 'ICSE',      label: 'ICSE / ISC – Indian Certificate of Secondary Education' },
  { value: 'STATE',     label: 'State Board' },
  { value: 'IB',        label: 'IB – International Baccalaureate' },
  { value: 'IGCSE',     label: 'IGCSE – Cambridge International' },
  { value: 'CAMBRIDGE', label: 'Cambridge (A-Level)' },
  { value: 'OTHER',     label: 'Other' },
] as const

export const SCHOOL_TYPES = [
  { value: 'private',       label: 'Private' },
  { value: 'government',    label: 'Government' },
  { value: 'aided',         label: 'Government Aided' },
  { value: 'international', label: 'International' },
  { value: 'autonomous',    label: 'Autonomous' },
] as const

const _boardValues = ['CBSE', 'ICSE', 'STATE', 'IB', 'IGCSE', 'CAMBRIDGE', 'OTHER'] as const
const _typeValues  = ['private', 'government', 'aided', 'international', 'autonomous'] as const

const _currentYear = new Date().getFullYear()

// ── Base step object shapes (no object-level .refine/.superRefine) ────────────

const _step1Base = z.object({
  school_name: z
    .string()
    .trim()
    .min(2, 'School name must be at least 2 characters')
    .max(255, 'School name is too long'),
  board: z.enum(_boardValues, {
    errorMap: () => ({ message: 'Please select a curriculum board' }),
  }),
  other_board: z.preprocess(
    preprocessOptional,
    z.string().max(100, 'Board name is too long').optional(),
  ),
  school_type: z.enum(_typeValues, {
    errorMap: () => ({ message: 'Please select a school type' }),
  }),
  established_year: z.preprocess(
    preprocessOptional,
    z.string().regex(/^\d{4}$/, 'Must be a 4-digit year').optional().refine(
      (val) => {
        if (!val) return true
        const y = parseInt(val, 10)
        return y >= 1850 && y <= _currentYear
      },
      { message: `Must be between 1850 and ${_currentYear}` },
    ),
  ),
})

const _step2Base = z.object({
  email: z.string().trim().toLowerCase().email('Invalid school email address'),
  mobile: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Mobile must be exactly 10 digits (no spaces or hyphens)'),
  phone: z.preprocess(
    preprocessOptional,
    z.string().regex(/^\d{6,15}$/, 'Phone must be 6–15 digits (no spaces or hyphens)').optional(),
  ),
  address_line_1: z
    .string()
    .trim()
    .min(5, 'Street address must be at least 5 characters')
    .max(500),
  address_line_2: z.preprocess(
    preprocessOptional,
    z.string().max(500).optional(),
  ),
  city: z
    .string()
    .trim()
    .min(2, 'City name must be at least 2 characters')
    .max(100),
  state: z.enum([...INDIAN_STATES] as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid state' }),
  }),
  pin_code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
  area: z
    .string({ required_error: 'Please select an area / post office' })
    .min(1, 'Please select an area / post office'),
})

const _step3Base = z.object({
  student_count: z
    .string()
    .trim()
    .min(1, 'Student count is required')
    .regex(/^\d+$/, 'Must be a whole number (digits only)')
    .refine((v) => parseInt(v, 10) >= 1, 'Must be at least 1 student')
    .refine((v) => parseInt(v, 10) <= 200_000, 'Cannot exceed 200,000 students'),
  medium_of_instruction: z.preprocess(
    preprocessOptional,
    z.string().max(100).optional(),
  ),
  other_medium_of_instruction: z.preprocess(
    preprocessOptional,
    z.string().max(100, 'Medium is too long').optional(),
  ),
  classes_from: z.preprocess(preprocessOptional, z.string().optional()),
  classes_to:   z.preprocess(preprocessOptional, z.string().optional()),
  udise_code: z.preprocess(
    preprocessOptional,
    z.string()
      .regex(/^\d{11}$/, 'UDISE code must be exactly 11 digits')
      .optional(),
  ),
})

const _step5Base = z.object({
  principal_name: z
    .string()
    .trim()
    .min(2, 'Principal name must be at least 2 characters')
    .max(255),
  principal_email: z.string().trim().toLowerCase().email('Invalid principal email address'),
  principal_password: passwordField.describe(
    'Must contain uppercase, lowercase, number, and special character',
  ),
  confirm_password: z.string().min(1, 'Please confirm your password'),
  terms: termsField,
})

// Shared superRefine logic extracted to avoid duplication
function _refineStep1(
  data: { board: string; other_board?: string },
  ctx: z.RefinementCtx,
) {
  if (data.board === 'OTHER' && (!data.other_board || data.other_board.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please specify your curriculum board',
      path: ['other_board'],
    })
  }
}

function _refineStep3Medium(
  data: { medium_of_instruction?: string; other_medium_of_instruction?: string },
  ctx: z.RefinementCtx,
) {
  if (
    data.medium_of_instruction === 'Other' &&
    (!data.other_medium_of_instruction || data.other_medium_of_instruction.trim() === '')
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please specify your medium of instruction',
      path: ['other_medium_of_instruction'],
    })
  }
}

function _refineClassRange(
  data: { classes_from?: string; classes_to?: string },
): boolean {
  const from = data.classes_from ? parseInt(data.classes_from, 10) : undefined
  const to   = data.classes_to   ? parseInt(data.classes_to,   10) : undefined
  if (from !== undefined && to !== undefined && !isNaN(from) && !isNaN(to)) {
    return from <= to
  }
  return true
}

// ── Per-step schemas (used by trigger() in the wizard) ────────────────────────

export const onboardingStep1Schema = _step1Base.superRefine(_refineStep1)

export const onboardingStep2Schema = _step2Base

export const onboardingStep3Schema = _step3Base
  .superRefine(_refineStep3Medium)
  .refine(_refineClassRange, {
    message: 'Starting class must be ≤ ending class',
    path: ['classes_to'],
  })

export const onboardingStep5Schema = _step5Base.refine(
  (d) => d.principal_password === d.confirm_password,
  { message: 'Passwords do not match', path: ['confirm_password'] },
)

// ── Combined schema — built by merging step bases to avoid field duplication ──

export const schoolOnboardingSchema = _step1Base
  .merge(_step2Base)
  .merge(_step3Base)
  .merge(_step5Base)
  .superRefine((data, ctx) => {
    _refineStep1(data, ctx)
    _refineStep3Medium(data, ctx)
  })
  .refine((d) => d.principal_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
  .refine(_refineClassRange, {
    message: 'Starting class must be ≤ ending class',
    path: ['classes_to'],
  })

// ─── Inferred types ───────────────────────────────────────────────────────────

export type LoginFormData                       = z.infer<typeof loginSchema>
export type RegisterFormData                    = z.infer<typeof registerSchema>
export type StudentRegisterFormData             = z.infer<typeof studentRegisterSchema>
export type TeacherRegisterFormData             = z.infer<typeof teacherRegisterSchema>
export type TeacherInviteFormData               = z.infer<typeof teacherInviteFormSchema>
export type ParentRegisterFormData              = z.infer<typeof parentRegisterSchema>
export type VerifyOtpFormData                   = z.infer<typeof verifyOtpSchema>
export type ForgotPasswordFormData              = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData               = z.infer<typeof resetPasswordSchema>
export type MarkAttendanceFormData              = z.infer<typeof markAttendanceSchema>
export type EnrollFormData                      = z.infer<typeof enrollSchema>
export type QAFormData                          = z.infer<typeof qaSchema>
export type SurveySearchFormData                = z.infer<typeof surveySearchSchema>
export type GoogleCompleteStudentFormData       = z.infer<typeof googleCompleteStudentSchema>
export type GoogleCompleteTeacherFormData       = z.infer<typeof googleCompleteTeacherSchema>
export type GoogleCompleteTeacherInviteFormData = z.infer<typeof googleCompleteTeacherInviteSchema>
export type GoogleCompleteParentFormData        = z.infer<typeof googleCompleteParentSchema>
export type SchoolOnboardingFormData            = z.infer<typeof schoolOnboardingSchema>
