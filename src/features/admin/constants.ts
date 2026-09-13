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

// Grade range options for the school-creation / onboarding forms live in
// shared/lib/classes.ts alongside the canonical vocabulary they come from, and are
// re-exported here so existing admin imports keep working. Note these are for
// *defining a grade range* only — a school's actual classes come from its roster
// (see useSchoolClasses / ClassSelect), never from this list.
export { GRADE_OPTIONS, gradeRangeToClassNames } from "@/shared/lib/classes";
