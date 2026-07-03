import { z } from "zod";
import { termsField, preprocessOptional } from "@/shared/lib/validators";
import { INDIAN_STATES } from "./constants";

const _boardValues = [
  "CBSE",
  "ICSE",
  "STATE",
  "IB",
  "IGCSE",
  "CAMBRIDGE",
  "OTHER",
] as const;
const _typeValues = [
  "private",
  "government",
  "aided",
  "international",
  "autonomous",
  "other",
] as const;

const _currentYear = new Date().getFullYear();

// ── Base step object shapes (no object-level .refine/.superRefine) ────────────

const _step1Base = z.object({
  school_name: z
    .string()
    .trim()
    .min(2, "School name must be at least 2 characters")
    .max(255, "School name is too long"),
  board: z.enum(_boardValues, {
    errorMap: () => ({ message: "Please select a curriculum board" }),
  }),
  other_board: z.preprocess(
    preprocessOptional,
    z.string().max(100, "Board name is too long").optional(),
  ),
  school_type: z.enum(_typeValues, {
    errorMap: () => ({ message: "Please select a school type" }),
  }),
  other_school_type: z.preprocess(
    preprocessOptional,
    z.string().max(100, "School type is too long").optional(),
  ),
  established_year: z.preprocess(
    preprocessOptional,
    z
      .string()
      .regex(/^\d{4}$/, "Must be a 4-digit year")
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const y = parseInt(val, 10);
          return y >= 1850 && y <= _currentYear;
        },
        { message: `Must be between 1850 and ${_currentYear}` },
      ),
  ),
});

const _step2Base = z.object({
  email: z.string().trim().toLowerCase().email("Invalid school email address"),
  mobile: z
    .string()
    .trim()
    .regex(
      /^\d{10}$/,
      "Mobile must be exactly 10 digits (no spaces or hyphens)",
    ),
  phone: z.preprocess(
    preprocessOptional,
    z
      .string()
      .regex(/^\d{6,15}$/, "Phone must be 6–15 digits (no spaces or hyphens)")
      .optional(),
  ),
  address_line_1: z
    .string()
    .trim()
    .min(5, "Street address must be at least 5 characters")
    .max(500),
  address_line_2: z.preprocess(
    preprocessOptional,
    z.string().max(500).optional(),
  ),
  city: z
    .string()
    .trim()
    .min(2, "City name must be at least 2 characters")
    .max(100),
  state: z.enum([...INDIAN_STATES] as [string, ...string[]], {
    errorMap: () => ({ message: "Please select a valid state" }),
  }),
  pin_code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "PIN code must be exactly 6 digits"),
  area: z
    .string({ required_error: "Please select an area / post office" })
    .min(1, "Please select an area / post office"),
});

const _step3Base = z.object({
  student_count: z
    .string()
    .trim()
    .min(1, "Student count is required")
    .regex(/^\d+$/, "Must be a whole number (digits only)")
    .refine((v) => parseInt(v, 10) >= 1, "Must be at least 1 student")
    .refine(
      (v) => parseInt(v, 10) <= 200_000,
      "Cannot exceed 200,000 students",
    ),
  medium_of_instruction: z.preprocess(
    preprocessOptional,
    z.string().max(100).optional(),
  ),
  other_medium_of_instruction: z.preprocess(
    preprocessOptional,
    z.string().max(100, "Medium is too long").optional(),
  ),
  classes_from: z.preprocess(preprocessOptional, z.string().optional()),
  classes_to: z.preprocess(preprocessOptional, z.string().optional()),
  udise_code: z.preprocess(
    preprocessOptional,
    z
      .string()
      .regex(/^\d{11}$/, "UDISE code must be exactly 11 digits")
      .optional(),
  ),
});

// No password is collected during onboarding — the principal sets their own
// via a one-time code emailed on approval. Step 5 captures identity + consent only.
const _step5Base = z.object({
  principal_name: z
    .string()
    .trim()
    .min(2, "Principal name must be at least 2 characters")
    .max(255),
  principal_email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid principal email address"),
  // Optional: filled in when office staff apply on behalf of the principal.
  filled_by_email: z.preprocess(
    preprocessOptional,
    z.string().trim().toLowerCase().email("Invalid email address").optional(),
  ),
  terms: termsField,
});

// Shared superRefine logic extracted to avoid duplication
function _refineStep1(
  data: {
    board: string;
    other_board?: string;
    school_type: string;
    other_school_type?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (
    data.board === "OTHER" &&
    (!data.other_board || data.other_board.trim() === "")
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify your curriculum board",
      path: ["other_board"],
    });
  }
  if (
    data.school_type === "other" &&
    (!data.other_school_type || data.other_school_type.trim() === "")
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify your school type",
      path: ["other_school_type"],
    });
  }
}

function _refineStep3Medium(
  data: {
    medium_of_instruction?: string;
    other_medium_of_instruction?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (
    data.medium_of_instruction === "Other" &&
    (!data.other_medium_of_instruction ||
      data.other_medium_of_instruction.trim() === "")
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify your medium of instruction",
      path: ["other_medium_of_instruction"],
    });
  }
}

function _refineClassRange(data: {
  classes_from?: string;
  classes_to?: string;
}): boolean {
  const from = data.classes_from ? parseInt(data.classes_from, 10) : undefined;
  const to = data.classes_to ? parseInt(data.classes_to, 10) : undefined;
  if (from !== undefined && to !== undefined && !isNaN(from) && !isNaN(to)) {
    return from <= to;
  }
  return true;
}

// ── Per-step schemas (used by trigger() in the wizard) ────────────────────────

export const onboardingStep1Schema = _step1Base.superRefine(_refineStep1);

export const onboardingStep2Schema = _step2Base;

export const onboardingStep3Schema = _step3Base
  .superRefine(_refineStep3Medium)
  .refine(_refineClassRange, {
    message: "Starting class must be ≤ ending class",
    path: ["classes_to"],
  });

export const onboardingStep5Schema = _step5Base;

// ── Combined schema — built by merging step bases to avoid field duplication ──

export const schoolOnboardingSchema = _step1Base
  .merge(_step2Base)
  .merge(_step3Base)
  .merge(_step5Base)
  .superRefine((data, ctx) => {
    _refineStep1(data, ctx);
    _refineStep3Medium(data, ctx);
  })
  .refine(_refineClassRange, {
    message: "Starting class must be ≤ ending class",
    path: ["classes_to"],
  });

export type SchoolOnboardingFormData = z.infer<typeof schoolOnboardingSchema>;
