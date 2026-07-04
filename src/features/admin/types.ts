// ── Admin Management Types ─────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  account_status: string;
  is_active: boolean;
  created_by: string | null;
  created_by_email: string | null;
  created_by_name: string | null;
  created_at: string | null;
}

export interface CreateAdminRequest {
  email: string;
  password: string;
  full_name?: string;
}

// ── Onboarding Application Types (admin view) ──────────────────────────────

export type OnboardingStatus =
  | "pending_verification"
  | "email_verified"
  | "changes_requested"
  | "approved"
  | "rejected";

export interface OnboardingApplicationSummary {
  application_id: string;
  school_name: string;
  principal_name: string;
  principal_email: string;
  city: string;
  state: string;
  onboarding_status: OnboardingStatus;
  applied_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export interface OnboardingApplicationDetail {
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
  udise_verified: boolean;
  certificate_url: string | null;
  certificate_status: "not_provided" | "uploaded" | "upload_failed";
  principal_name: string;
  principal_email: string;
  filled_by_email: string | null;
  onboarding_status: OnboardingStatus;
  rejection_reason: string | null;
  admin_message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_at: string | null;
  updated_at: string | null;
}

export interface ApproveApplicationResponse {
  application_id: string;
  school_id: string;
  principal_id: string;
  school_name: string;
  message: string;
}

export interface SchoolSetupStatus {
  school_id: string;
  teachers: number;
  principals: number;
  class_codes: number;
  students: number;
  recordings: number;
}

export interface BulkImportResult {
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

export interface RejectApplicationRequest {
  rejection_reason?: string;
}

export interface RequestChangesRequest {
  message: string;
}

// ── Prompt management types ────────────────────────────────────────────────

export type PromptRole = "system" | "user" | "assistant";

export interface PromptMessage {
  role: PromptRole;
  content: string;
}

export interface PromptConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  provider?: string;
  json_mode?: boolean;
  [key: string]: unknown;
}

export interface PromptSummary {
  name: string;
  module: string;
  type: "chat" | "text";
  variables: string[];
  sentinels: string[];
  config: PromptConfig;
  current_version: number | null;
  labels: string[];
  is_fallback: boolean;
  /** Why the runtime is/isn't serving the Langfuse version (e.g. an integrity
   *  rejection of a UI edit). null when serving Langfuse cleanly. */
  fallback_reason: string | null;
}

export interface PromptVersion {
  version: number;
  labels: string[];
  config: PromptConfig;
  commit_message: string | null;
}

export interface PromptDetail {
  name: string;
  module: string;
  type: "chat" | "text";
  variables: string[];
  sentinels: string[];
  messages: PromptMessage[] | null;
  text: string | null;
  config: PromptConfig;
  current_version: number | null;
  versions: PromptVersion[];
  langfuse_enabled: boolean;
  allowed_models: string[];
}

export interface PromptConfigPatch {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface SavePromptRequest {
  messages?: PromptMessage[];
  text?: string;
  config: PromptConfigPatch;
}

export interface SavePromptResponse {
  name: string;
  version: number | null;
  label: string;
  message: string;
}

export interface PromptRefreshResponse {
  name: string;
  version: number | null;
  is_fallback: boolean;
  /** "langfuse" | "fallback" | "local" | "client_unavailable" */
  source: string;
  /** Human-readable explanation when not serving Langfuse. null when source == "langfuse". */
  reason: string | null;
  label: string | null;
}

// ── Platform overview (admin dashboard) ───────────────────────────────────────

export interface RoleCount {
  role: string;
  count: number;
}

export interface PlatformTrendPoint {
  date: string; // DD-MM-YYYY
  present: number;
  total_marked: number;
  percentage: number;
}

export interface SchoolEnrollment {
  school_name: string;
  students: number;
}

export interface OnboardingStatusCount {
  status: string;
  count: number;
}

export interface PlatformOverview {
  schools_active: number;
  students_enrolled: number;
  users_total: number;
  users_by_role: RoleCount[];
  new_users_30d: number;
  attendance_records_total: number;
  attendance_trend: PlatformTrendPoint[]; // last 14 days
  recordings_total: number;
  recordings_30d: number;
  rag_documents_total: number;
  onboarding_by_status: OnboardingStatusCount[];
  top_schools: SchoolEnrollment[];
}
