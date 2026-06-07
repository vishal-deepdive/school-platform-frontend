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
  pending_verification: "bg-yellow-100 text-yellow-800 border-yellow-200",
  email_verified: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};
