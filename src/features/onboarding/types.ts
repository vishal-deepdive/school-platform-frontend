// ── School Onboarding Types ──────────────────────────────────────────────────

export type OnboardingStatus =
  | "pending_verification"
  | "email_verified"
  | "changes_requested"
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
  admin_message: string | null;
}

export interface UdiseLookupResponse {
  verified: boolean;
  data: {
    school_name: string | null;
    state: string | null;
    district: string | null;
    city: string | null;
    pin_code: string | null;
  } | null;
}

// Full editable application returned by the resubmit-prefill endpoint.
export interface OnboardingResubmitData {
  application_id: string;
  school_name: string;
  board: string | null;
  other_board: string | null;
  school_type: string | null;
  other_school_type: string | null;
  established_year: string | null;
  email: string;
  mobile: string;
  phone: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  pin_code: string;
  student_count: number;
  medium_of_instruction: string | null;
  other_medium_of_instruction: string | null;
  classes_from: string | null;
  classes_to: string | null;
  udise_code: string | null;
  principal_name: string;
  principal_email: string;
  filled_by_email: string | null;
  certificate_url: string | null;
  certificate_status: "not_provided" | "uploaded" | "upload_failed";
  onboarding_status: OnboardingStatus;
  rejection_reason: string | null;
  admin_message: string | null;
}

// ── Capabilities (feature-flag probe) ──────────────────────────────────────────

export interface OnboardingCapabilities {
  udise_lookup_available: boolean;
  captcha_enabled: boolean;
  captcha_site_key: string | null;
}

// ── Draft persistence (resume-via-email) ────────────────────────────────────────

export interface SaveDraftResponse {
  token: string;
  expires_at: string;
}

export interface DraftData {
  form_data: Record<string, unknown>;
  current_step: number;
  email: string | null;
  updated_at: string | null;
}
