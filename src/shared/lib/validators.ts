import { z } from "zod";

// ─── Shared validation primitives ──────────────────────────────────────────────
// Feature-specific schemas live in `src/features/<module>/schema.ts` and compose
// these primitives. Keep this file free of any one feature's domain rules.

/**
 * Preprocessor for optional text fields: trims whitespace and converts an
 * empty (or whitespace-only) string to `undefined` so downstream `.optional()`
 * sees it as absent rather than as an empty value.
 */
export const preprocessOptional = (v: unknown): unknown => {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  return trimmed === "" ? undefined : trimmed;
};

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-=_+[\]{};:'",.<>/?\\|`~]).{8,128}$/;

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(
    PASSWORD_REGEX,
    "Password must contain uppercase, lowercase, number, and special character",
  );

/** Trims whitespace and normalises to lowercase before validating e-mail format. */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address");

export const inviteTokenField = z
  .string()
  .length(8, "Invite code must be exactly 8 characters")
  .regex(
    /^[A-Za-z2-9]{8}$/,
    "Invite code must contain only letters and digits 2–9",
  );

/** Returns true when a string matches the invite token format (8 chars: letters + digits 2–9). */
export function isValidInviteToken(token: string): boolean {
  return /^[A-Za-z2-9]{8}$/.test(token);
}

export const otpField = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d{6}$/, "OTP must be numeric");

/** Reusable terms-acceptance field for all registration forms. */
export const termsField = z
  .boolean()
  .refine((v) => v === true, "You must accept the terms and conditions");

/**
 * Optional name/text field: trims surrounding whitespace and treats an
 * empty or whitespace-only value as absent (undefined), not as an empty string.
 */
export const optionalNameField = z.preprocess(
  preprocessOptional,
  z.string().min(1, "Cannot be blank").max(255, "Too long").optional(),
);
