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

export interface OnboardingStats {
  pending_verification: number;
  needs_review: number;
  changes_requested: number;
  approved: number;
  rejected: number;
  approved_this_month: number;
  avg_decision_days: number | null;
  oldest_needs_review_at: string | null;
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

// ── Schools management ─────────────────────────────────────────────────────

export interface SchoolListItem {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  state: string | null;
  board: string | null;
  udise_code: string | null;
  current_session: string | null;
  is_active: boolean;
  created_at: string | null;
  students: number;
  teachers: number;
  class_codes: number;
  principal_id: string | null;
  principal_name: string | null;
  principal_email: string | null;
}

export interface SchoolPrincipalInfo {
  id: string;
  email: string;
  full_name: string | null;
  account_status: string;
}

export interface SchoolSetupCounts {
  teachers: number;
  principals: number;
  class_codes: number;
  students: number;
  recordings: number;
}

export interface SchoolDetail {
  id: string;
  name: string;
  code: string | null;
  board: string | null;
  other_board: string | null;
  school_type: string | null;
  other_school_type: string | null;
  established_year: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  student_count: number | null;
  medium_of_instruction: string | null;
  classes_from: string | null;
  classes_to: string | null;
  udise_code: string | null;
  current_session: string | null;
  attendance_mode: string | null;
  max_class: string | null;
  session_end_date: string | null;
  is_active: boolean;
  created_at: string | null;
  principal: SchoolPrincipalInfo | null;
  counts: SchoolSetupCounts;
}

export interface CreateSchoolRequest {
  // Identity (name, board required)
  name: string;
  code?: string;
  board: string;
  other_board?: string;
  school_type?: string;
  other_school_type?: string;
  established_year?: string;
  udise_code?: string;
  // Contact & address (city, state required)
  email?: string;
  mobile?: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city: string;
  state: string;
  pin_code?: string;
  // Academics (current_session required)
  current_session: string;
  medium_of_instruction?: string;
  other_medium_of_instruction?: string;
  classes_from?: string;
  classes_to?: string;
  student_count?: number;
}

export interface BulkClassCodeRequest {
  class_names: string[];
  sections?: string[];
  session?: string;
  expires_hours?: number;
}

export interface ProvisionPrincipalRequest {
  email: string;
  full_name?: string;
}

export interface ProvisionedUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  school_id: string | null;
  account_status: string;
  message: string;
}

export interface ClassCode {
  code: string;
  school_id: string;
  class_name: string;
  section: string | null;
  session: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface CreateClassCodeRequest {
  class_name: string;
  section?: string;
  session?: string;
  expires_hours?: number;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  teacher_email: string | null;
  teacher_name: string | null;
  school_id: string;
  class_name: string;
  section: string | null;
  is_active: boolean;
}

export interface CreateTeacherAssignmentRequest {
  teacher_id: string;
  class_name: string;
  section?: string;
}

export interface RagAccessItem {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  school_id: string;
  is_active: boolean;
}

// ── Student lifecycle (create / promote) ───────────────────────────────────

export interface CreateStudentRequest {
  email: string;
  full_name?: string;
  roll_no: string;
  class_name: string;
  section?: string;
  session?: string;
}

export interface PromoteStudentRequest {
  target_class?: string;
  target_section?: string;
  target_session?: string;
}

export interface PromoteStudentResult {
  roll_no: string;
  status: "promoted" | "passed_out";
  class_name: string | null;
  section: string | null;
  session: string | null;
}

export interface PromoteClassRequest {
  class_name: string;
  section?: string;
  session?: string;
  target_session?: string;
}

export interface PromoteClassResult {
  class_name: string;
  section: string | null;
  promoted: number;
  passed_out: number;
}

export interface PromoteSchoolResult {
  from_session: string;
  to_session: string;
  promoted: number;
  passed_out: number;
}

export interface UpdatePromotionSettingsRequest {
  max_class?: string | null;
  session_end_date?: string | null;
}

export interface PromotionSettings {
  school_id: string;
  max_class: string | null;
  session_end_date: string | null;
}

// ── User management ────────────────────────────────────────────────────────

export type UserRoleFilter =
  | "admin"
  | "principal"
  | "teacher"
  | "student"
  | "parent";

export interface AdminUserListItem {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  school_id: string | null;
  school_name: string | null;
  account_status: string;
  is_active: boolean;
  roll_number: string | null;
  created_at: string | null;
}

export interface PaginatedUsers {
  items: AdminUserListItem[];
  total: number;
}

export interface UserListParams {
  school_id?: string;
  role?: string;
  status?: "active" | "inactive";
  search?: string;
  limit?: number;
  offset?: number;
}

// ── Audit log ──────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: number;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  school_id: string | null;
  school_name: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  request_id: string | null;
  ip: string | null;
  created_at: string | null;
}

export interface PaginatedAudit {
  items: AuditLogEntry[];
  total: number;
}

export interface AuditLogParams {
  action?: string;
  actor?: string;
  school_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
