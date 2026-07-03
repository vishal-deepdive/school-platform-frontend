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

