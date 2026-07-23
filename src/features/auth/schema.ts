import { z } from "zod";
import {
  emailField,
  passwordField,
  optionalNameField,
  termsField,
  otpField,
} from "@/shared/lib/validators";

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required").max(128),
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

// ─── Guardian mobile+OTP login ──────────────────────────────────────────────

const mobileField = z
  .string()
  .trim()
  .min(6, "Enter a valid mobile number")
  .max(20, "Enter a valid mobile number")
  .regex(/^[0-9+\s-]+$/, "Enter a valid mobile number");

export const mobileOtpRequestSchema = z.object({
  mobile: mobileField,
});

export const mobileOtpVerifySchema = z.object({
  mobile: mobileField,
  otp: otpField,
});

// ─── Student admission-number login ─────────────────────────────────────────

export const studentLoginSchema = z.object({
  school_code: z.string().trim().min(1, "School code is required").max(50),
  roll_no: z.string().trim().min(1, "Roll / admission number is required").max(100),
  password: z.string().min(1, "Password is required").max(128),
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
    reset_token: z.string().min(1, "Reset token is missing"),
    new_password: passwordField,
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// ─── Google OAuth completion ──────────────────────────────────────────────────
// Teacher / co-principal invite claim only — students and parents don't
// self-register, so there is no student/parent Google-completion schema.

/** Teacher-via-invite OAuth completion — token comes from sessionStorage, not the form. */
export const googleCompleteTeacherInviteSchema = z.object({
  full_name: optionalNameField,
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type LoginFormData = z.infer<typeof loginSchema>;
export type TeacherInviteFormData = z.infer<typeof teacherInviteFormSchema>;
export type MobileOtpRequestFormData = z.infer<typeof mobileOtpRequestSchema>;
export type MobileOtpVerifyFormData = z.infer<typeof mobileOtpVerifySchema>;
export type StudentLoginFormData = z.infer<typeof studentLoginSchema>;
export type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type GoogleCompleteTeacherInviteFormData = z.infer<
  typeof googleCompleteTeacherInviteSchema
>;
