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

// Invite tokens are minted server-side as `secrets.token_hex(32)` — a 64-char
// lowercase-hex string — and the backend enforces min/max length 64 on
// /register/teacher. The client validators MUST match that shape exactly; an
// earlier 8-char rule silently rejected every real invite link.
const INVITE_TOKEN_REGEX = /^[a-fA-F0-9]{64}$/;

export const inviteTokenField = z
  .string()
  .trim()
  .length(64, "Invalid invite token")
  .regex(INVITE_TOKEN_REGEX, "Invalid invite token");

/** Returns true when a string matches the invite token format (64-char hex). */
export function isValidInviteToken(token: string): boolean {
  return INVITE_TOKEN_REGEX.test(token);
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
