/**
 * Shared display constants for onboarding application status.
 * Imported by both OnboardingApplicationsPage and ApplicationDetailPage.
 */
import type { OnboardingStatus } from "@/features/admin/types";

export const APPLICATION_STATUS_LABELS: Record<OnboardingStatus, string> = {
  pending_verification: "Pending Email Verification",
  email_verified: "Email Verified — Awaiting Review",
  approved: "Approved",
  rejected: "Rejected",
};

/** Includes border colour for use with `border` utility on the badge element. */
export const APPLICATION_STATUS_COLORS: Record<OnboardingStatus, string> = {
  pending_verification:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  email_verified:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  approved:
    "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};
