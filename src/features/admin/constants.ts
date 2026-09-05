/**
 * Shared display constants for onboarding application status.
 * Imported by both OnboardingApplicationsPage and ApplicationDetailPage.
 */
import type { BadgeVariant } from "@/shared/components/ui/Badge";
import type { OnboardingStatus } from "@/features/admin/types";

export const APPLICATION_STATUS_LABELS: Record<OnboardingStatus, string> = {
  pending_verification: "Pending Email Verification",
  email_verified: "Email Verified — Awaiting Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  rejected: "Rejected",
};

export const APPLICATION_STATUS_BADGE_VARIANTS: Record<OnboardingStatus, BadgeVariant> = {
  pending_verification: "warning",
  email_verified: "info",
  changes_requested: "purple",
  approved: "success",
  rejected: "danger",
};

// ─── Manual school-creation option lists (mirror the onboarding wizard) ───────

export const SCHOOL_BOARDS = [
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE / ISC" },
  { value: "STATE", label: "State Board" },
  { value: "IB", label: "IB" },
  { value: "IGCSE", label: "IGCSE (Cambridge Intl.)" },
  { value: "CAMBRIDGE", label: "Cambridge (A-Level)" },
  { value: "OTHER", label: "Other" },
] as const;

export const SCHOOL_TYPES = [
  { value: "PRIVATE", label: "Private" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "AIDED", label: "Government Aided" },
  { value: "INTERNATIONAL", label: "International" },
  { value: "AUTONOMOUS", label: "Autonomous" },
  { value: "OTHER", label: "Other" },
] as const;

// Single source of truth for the school medium-of-instruction vocabulary —
// mirrors app.shared.mediums.SCHOOL_MEDIUMS on the backend exactly (enforced
// there by a DB CHECK constraint). Re-exported from onboarding's AcademicStep
// rather than duplicated, so the two option lists can never drift.
export const MEDIUM_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "Hindi" },
  { value: "Bilingual", label: "Bilingual (English + Hindi)" },
] as const;

/**
 * Grade options for the classes-from/to range and bulk class-code generation.
 * `value` is the token stored on the school (matches the onboarding scheme:
 * "0" = Nursery/KG, "1".."12"); `className` is the human-readable class label
 * used when generating class codes for a whole grade range.
 */
export const GRADE_OPTIONS = Array.from({ length: 13 }, (_, i) => {
  const n = i; // 0..12
  return {
    value: String(n),
    label: n === 0 ? "Nursery / KG" : `Class ${n}`,
    className: n === 0 ? "Nursery/KG" : `Class ${n}`,
  };
}) as ReadonlyArray<{ value: string; label: string; className: string }>;

/** Expand an inclusive grade range (by GRADE_OPTIONS value) into class names. */
export function gradeRangeToClassNames(from: string, to: string): string[] {
  const lo = Number(from);
  const hi = Number(to);
  if (Number.isNaN(lo) || Number.isNaN(hi) || hi < lo) return [];
  return GRADE_OPTIONS.filter((g) => {
    const n = Number(g.value);
    return n >= lo && n <= hi;
  }).map((g) => g.className);
}

