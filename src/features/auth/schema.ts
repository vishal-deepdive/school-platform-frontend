import { z } from "zod";
import {
  emailField,
  passwordField,
  optionalNameField,
  inviteTokenField,
  termsField,
  otpField,
} from "@/shared/lib/validators";

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required").max(128),
});

export const registerSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirm_password: z.string(),
    full_name: optionalNameField,
    role: z.enum(["admin", "teacher", "viewer"]),
    school_id: z
      .string()
      .uuid("Invalid school ID")
      .optional()
      .or(z.literal("")),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const studentRegisterSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirm_password: z.string(),
    full_name: optionalNameField,
    school_id: z.string().uuid("Invalid school ID"),
    class_code: z.string().trim().min(1, "Class code is required").max(16),
    roll_number: z.string().trim().min(1, "Roll number is required").max(50),
    terms: termsField,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const teacherRegisterSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirm_password: z.string(),
    full_name: optionalNameField,
    invite_token: inviteTokenField,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

/**
 * Teacher registration via invite link — invite_token comes from the URL,
 * not from the form, so it is injected at submit time.
 */
export const teacherInviteFormSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirm_password: z.string(),
    full_name: optionalNameField,
    terms: termsField,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const parentRegisterSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirm_password: z.string(),
    full_name: optionalNameField,
    school_id: z.string().uuid("Invalid school ID"),
    student_id: z.string().uuid("Invalid student ID"),
    relation: z.enum(["father", "mother", "guardian", "other"]),
    terms: termsField,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const verifyOtpSchema = z.object({
  email: emailField,
  otp: otpField,
  purpose: z.enum(["verify_email", "reset_password"]),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    email: emailField,
    otp: otpField,
    new_password: passwordField,
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// ─── Google OAuth completion ──────────────────────────────────────────────────

export const googleCompleteStudentSchema = z.object({
  full_name: optionalNameField,
  school_id: z.string().uuid("Invalid school ID"),
  class_code: z.string().trim().min(1, "Class code is required").max(16),
  roll_number: z.string().trim().min(1, "Roll number is required").max(50),
});

export const googleCompleteTeacherSchema = z.object({
  full_name: optionalNameField,
  invite_token: inviteTokenField,
});

/** Teacher-via-invite OAuth completion — token comes from sessionStorage, not the form. */
export const googleCompleteTeacherInviteSchema = z.object({
  full_name: optionalNameField,
});

export const googleCompleteParentSchema = z.object({
  full_name: optionalNameField,
  school_id: z.string().uuid("Invalid school ID"),
  student_id: z.string().uuid("Invalid student ID"),
  relation: z.enum(["father", "mother", "guardian", "other"]),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type StudentRegisterFormData = z.infer<typeof studentRegisterSchema>;
export type TeacherRegisterFormData = z.infer<typeof teacherRegisterSchema>;
export type TeacherInviteFormData = z.infer<typeof teacherInviteFormSchema>;
export type ParentRegisterFormData = z.infer<typeof parentRegisterSchema>;
export type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type GoogleCompleteStudentFormData = z.infer<
  typeof googleCompleteStudentSchema
>;
export type GoogleCompleteTeacherFormData = z.infer<
  typeof googleCompleteTeacherSchema
>;
export type GoogleCompleteTeacherInviteFormData = z.infer<
  typeof googleCompleteTeacherInviteSchema
>;
export type GoogleCompleteParentFormData = z.infer<
  typeof googleCompleteParentSchema
>;
