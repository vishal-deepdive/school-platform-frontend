// ── School Onboarding Types ──────────────────────────────────────────────────

export type OnboardingStatus =
  | "pending_verification"
  | "email_verified"
  | "approved"
  | "rejected";

export interface OnboardingApplicationResponse {
  application_id: string;
  school_name: string;
  onboarding_status: OnboardingStatus;
  message: string;
}

export interface OnboardingStatusResponse {
  application_id: string;
  school_name: string;
  onboarding_status: OnboardingStatus;
  applied_at: string | null;
  rejection_reason: string | null;
}
