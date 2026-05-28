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
  roll_number: z.string().min(1, 'Roll number is required').max(50),
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
    .length(8, 'Invite code must be exactly 8 characters')
    .regex(/^[A-Za-z2-9]{8}$/, 'Invite code must contain only letters and digits 2–9'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

/**
 * Schema for teacher registration via an invite link.
 * The invite_token is NOT a form field — it comes from the URL and is
 * injected behind the scenes when submitting to the API.
 */
export const teacherInviteFormSchema = z.object({
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
  roll_number: z.string().min(1, 'Roll number is required').max(50),
})

export const googleCompleteTeacherSchema = z.object({
  full_name: z.string().max(255).optional(),
  invite_token: z
    .string()
    .length(8, 'Invite code must be exactly 8 characters')
    .regex(/^[A-Za-z2-9]{8}$/, 'Invite code must contain only letters and digits 2–9'),
})

/**
 * Schema for completing Google OAuth registration as a teacher via invite link.
 * The invite_token comes from sessionStorage — hidden from the form UI.
 */
export const googleCompleteTeacherInviteSchema = z.object({
  full_name: z.string().max(255).optional(),
})

export const googleCompleteParentSchema = z.object({
  full_name: z.string().max(255).optional(),
  school_id: z.string().uuid('Invalid school ID'),
  student_id: z.string().uuid('Invalid student ID'),
  relation: z.enum(['father', 'mother', 'guardian', 'other']),
})

export type GoogleCompleteStudentFormData = z.infer<typeof googleCompleteStudentSchema>
export type GoogleCompleteTeacherFormData = z.infer<typeof googleCompleteTeacherSchema>
export type GoogleCompleteTeacherInviteFormData = z.infer<typeof googleCompleteTeacherInviteSchema>
export type GoogleCompleteParentFormData = z.infer<typeof googleCompleteParentSchema>

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type StudentRegisterFormData = z.infer<typeof studentRegisterSchema>
export type TeacherRegisterFormData = z.infer<typeof teacherRegisterSchema>
export type TeacherInviteFormData = z.infer<typeof teacherInviteFormSchema>
export type ParentRegisterFormData = z.infer<typeof parentRegisterSchema>
export type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type MarkAttendanceFormData = z.infer<typeof markAttendanceSchema>
export type EnrollFormData = z.infer<typeof enrollSchema>
export type QAFormData = z.infer<typeof qaSchema>
export type SurveySearchFormData = z.infer<typeof surveySearchSchema>

// ── School Onboarding Wizard ─────────────────────────────────────────────────

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

// Internal enum tuple references (keeps schemas DRY)
const _boardValues = ['CBSE', 'ICSE', 'STATE', 'IB', 'IGCSE', 'CAMBRIDGE', 'OTHER'] as const
const _typeValues  = ['private', 'government', 'aided', 'international', 'autonomous'] as const

// Per-step schemas — used by trigger() in the wizard

export const onboardingStep1Schema = z.object({
  school_name: z.string()
    .min(2, 'School name must be at least 2 characters')
    .max(255, 'School name is too long'),
  board: z.enum(_boardValues, {
    errorMap: () => ({ message: 'Please select a curriculum board' }),
  }),
  other_board: z.string().max(100, 'Board name is too long').optional(),
  school_type: z.enum(_typeValues, {
    errorMap: () => ({ message: 'Please select a school type' }),
  }),
  other_school_type: z.string().max(100, 'School type is too long').optional(),
  established_year: z.string().optional().refine(val => {
    if (!val) return true;
    if (!/^\d{4}$/.test(val)) return false;
    const year = parseInt(val, 10);
    return year > 1850 && year < new Date().getFullYear();
  }, { message: `Must be a 4-digit year between 1851 and ${new Date().getFullYear() - 1}` }),
}).superRefine((data, ctx) => {
  if (data.board === 'OTHER' && (!data.other_board || data.other_board.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please specify your curriculum board',
      path: ['other_board'],
    })
  }
  // If school type had an 'other' option, we'd validate it similarly. The schema allows autonomous, which might not be OTHER, but if we had OTHER in _typeValues, we would check it here. Let's add the check just in case it is added.
})

export const onboardingStep2Schema = z.object({
  email: z.string().email('Invalid school email address'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^\d{10}$/, 'Mobile must be exactly 10 digits (no spaces or hyphens)'),
  phone: z.string().max(20, 'Phone number is too long').optional(),
  address_line_1: z.string()
    .min(1, 'Street address is required')
    .max(500),
  address_line_2: z.string().max(500).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'Please select a state').max(100),
  pin_code: z
    .string()
    .min(1, 'PIN code is required')
    .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
  area: z.string({ required_error: 'Please select an area / post office' }).min(1, 'Please select an area / post office'),
})

export const onboardingStep3Schema = z
  .object({
    student_count: z
      .string()
      .min(1, 'Student count is required')
      .refine(
        (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 1,
        'Must be at least 1 student',
      )
      .refine(
        (v) => parseInt(v, 10) <= 200_000,
        'Cannot exceed 200,000 students',
      ),
    medium_of_instruction: z.string().max(100).optional(),
    other_medium_of_instruction: z.string().max(100, 'Medium is too long').optional(),
    classes_from: z.string().optional(),
    classes_to: z.string().optional(),
    udise_code: z.string().max(20, 'UDISE code is too long').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.medium_of_instruction === 'Other' && (!data.other_medium_of_instruction || data.other_medium_of_instruction.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify your medium of instruction',
        path: ['other_medium_of_instruction'],
      })
    }
  })
  .refine(
    (data) => {
      const from = data.classes_from ? parseInt(data.classes_from, 10) : undefined
      const to   = data.classes_to   ? parseInt(data.classes_to,   10) : undefined
      if (from !== undefined && to !== undefined && !isNaN(from) && !isNaN(to)) {
        return from <= to
      }
      return true
    },
    { message: 'Starting class must be ≤ ending class', path: ['classes_to'] },
  )

export const onboardingStep5Schema = z
  .object({
    principal_name: z
      .string()
      .min(2, 'Principal name must be at least 2 characters')
      .max(255),
    principal_email: z.string().email('Invalid principal email address'),
    principal_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(
        PASSWORD_REGEX,
        'Must contain uppercase, lowercase, number, and special character',
      ),
    confirm_password: z.string().min(1, 'Please confirm your password'),
    terms: z
      .boolean()
      .refine((v) => v === true, 'You must accept the terms and conditions'),
  })
  .refine((d) => d.principal_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

// Combined flat schema — drives the single useForm instance for the wizard
export const schoolOnboardingSchema = z
  .object({
    // Step 1 – School identity
    school_name: z.string().min(2, 'School name must be at least 2 characters').max(255),
    board: z.enum(_boardValues, {
      errorMap: () => ({ message: 'Please select a curriculum board' }),
    }),
    other_board: z.string().max(100).optional(),
    school_type: z.enum(_typeValues, {
      errorMap: () => ({ message: 'Please select a school type' }),
    }),
    other_school_type: z.string().max(100).optional(),
    established_year: z.string().optional().refine(val => {
      if (!val) return true;
      if (!/^\d{4}$/.test(val)) return false;
      const year = parseInt(val, 10);
      return year > 1850 && year < new Date().getFullYear();
    }, { message: `Must be a 4-digit year between 1851 and ${new Date().getFullYear() - 1}` }),
    // Step 2 – Contact & address
    email: z.string().email('Invalid school email address'),
    mobile: z
      .string()
      .min(1, 'Mobile number is required')
      .regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
    phone: z.string().max(20).optional(),
    address_line_1: z.string().min(1, 'Street address is required').max(500),
    address_line_2: z.string().max(500).optional(),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().min(1, 'Please select a state').max(100),
    pin_code: z.string().regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
    area: z.string({ required_error: 'Please select an area / post office' }).min(1, 'Please select an area / post office'),
    // Step 3 – Academic
    student_count: z
      .string()
      .min(1, 'Student count is required')
      .refine((v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 1, 'Must be at least 1 student')
      .refine((v) => parseInt(v, 10) <= 200_000, 'Cannot exceed 200,000 students'),
    medium_of_instruction: z.string().max(100).optional(),
    other_medium_of_instruction: z.string().max(100).optional(),
    classes_from: z.string().optional(),
    classes_to: z.string().optional(),
    udise_code: z.string().max(20).optional(),
    // Step 5 – Principal account
    principal_name: z.string().min(2, 'Principal name is required').max(255),
    principal_email: z.string().email('Invalid principal email address'),
    principal_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(
        PASSWORD_REGEX,
        'Must contain uppercase, lowercase, number, and special character',
      ),
    confirm_password: z.string().min(1, 'Please confirm your password'),
    terms: z.boolean().refine((v) => v === true, 'You must accept the terms and conditions'),
  })
  .refine((d) => d.principal_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
  .refine(
    (data) => {
      const from = data.classes_from ? parseInt(data.classes_from, 10) : undefined
      const to   = data.classes_to   ? parseInt(data.classes_to,   10) : undefined
      if (from !== undefined && to !== undefined && !isNaN(from) && !isNaN(to)) {
        return from <= to
      }
      return true
    },
    { message: 'Starting class must be ≤ ending class', path: ['classes_to'] },
  )
  .superRefine((data, ctx) => {
    if (data.board === 'OTHER' && (!data.other_board || data.other_board.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify your curriculum board',
        path: ['other_board'],
      })
    }
    if (data.medium_of_instruction === 'Other' && (!data.other_medium_of_instruction || data.other_medium_of_instruction.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify your medium of instruction',
        path: ['other_medium_of_instruction'],
      })
    }
  })

export type SchoolOnboardingFormData = z.infer<typeof schoolOnboardingSchema>
