export type AttendanceStatus = "P" | "A" | "L" | "E" | "H";

export interface EnrolledStudent {
  roll_no: string;
  name: string;
  images_processed: number;
}

export interface SkippedEntry {
  folder: string;
  reason: string;
}

export interface EnrollResponse {
  enrolled_students: EnrolledStudent[];
  school_name: string;
  session: string;
  class_name: string | null;
  section: string | null;
  subject: string | null;
  endpoint: string;
  skipped?: SkippedEntry[];
  removed_count?: number | null;
}

export interface UpdatedStudent {
  roll_no: string;
  name: string;
  images_processed: number;
  action: "updated" | "added";
}

export interface UpdateEmbeddingResponse {
  school_name: string;
  session: string;
  alpha: number;
  updated_count: number;
  added_count: number;
  updated_students: UpdatedStudent[];
  added_students: UpdatedStudent[];
  skipped?: SkippedEntry[];
}

export interface AttendanceRecord {
  roll_no: string;
  name: string;
  similarity?: number;
  status: AttendanceStatus;
}

export interface MarkAttendanceResponse {
  school_name: string;
  class_name: string;
  section: string;
  subject: string | null;
  session: string;
  date: string;
  time: string;
  total_enrolled: number;
  present_count: number;
  absent_count: number;
  present_students: AttendanceRecord[];
  absent_students: AttendanceRecord[];
}

// ── Manual roll-call ──────────────────────────────────────────────────────────

export interface RosterStudent {
  roll_no: string;
  name: string | null;
  // Stored status on the requested date, or null if not yet marked.
  status: AttendanceStatus | null;
}

export interface RosterResponse {
  school_name: string;
  class_name: string;
  section: string;
  subject: string | null;
  session: string;
  date: string | null;
  total_students: number;
  students: RosterStudent[];
}

export interface ManualMarkRecordInput {
  roll_no: string;
  status: AttendanceStatus;
}

export interface ManualMarkRequest {
  school_name?: string;
  class_name: string;
  section: string;
  subject?: string;
  session?: string;
  attendance_date?: string;
  allow_holiday?: boolean;
  records: ManualMarkRecordInput[];
}

export interface ManualMarkResultRecord {
  roll_no: string;
  name: string | null;
  status: AttendanceStatus;
}

export interface ManualMarkResponse {
  school_name: string;
  class_name: string;
  section: string;
  subject: string | null;
  session: string;
  date: string;
  time: string;
  total_marked: number;
  counts: Record<string, number>;
  records: ManualMarkResultRecord[];
}

export interface CorrectAttendanceResponse {
  school_name: string;
  class_name: string;
  section: string;
  subject: string | null;
  session: string;
  roll_no: string;
  name: string | null;
  status: AttendanceStatus;
  date: string;
  time: string;
}

export interface AttendanceDateRow {
  date: string;
  school: string;
  roll_number: string;
  name: string;
  class: string;
  subject: string;
  section: string;
  attendance_record: AttendanceStatus | string;
  time: string;
}

export interface AttendanceDateResponse {
  total_records: number;
  date: string;
  school_name: string;
  data: AttendanceDateRow[];
}

export interface AttendanceRangeStudent {
  school: string;
  roll_number: string;
  name: string;
  class: string;
  subject: string;
  section: string;
  total_days: number;
  total_present: number;
  total_absent: number;
  attendance_percentage: number;
  below_75_percent: "Yes" | "No";
  // Positional status string aligned to `dates`: one char per date index,
  // "P" | "A" | "L" | "E" | "H" | "-" (dash = no record that day).
  cells: string;
}

export interface AttendanceDateRange {
  start_date: string;
  end_date: string;
  total_days: number;
}

// Scope-wide roll-up — every student in scope, independent of row filters.
export interface AttendanceRangeSummary {
  total_students: number;
  avg_percentage: number;
  below_75_count: number;
}

export interface AttendanceRangePagination {
  page: number;
  page_size: number;
  total_pages: number;
  filtered_students: number;
}

export interface AttendanceRangeResponse {
  school_name: string;
  date_range: AttendanceDateRange;
  dates: string[];
  summary: AttendanceRangeSummary;
  pagination: AttendanceRangePagination;
  data: AttendanceRangeStudent[];
}

export interface ChangeLogEntry {
  school_name: string;
  class_name: string;
  section: string;
  subject: string;
  roll_no: string;
  session: string;
  change_type: string;
  endpoint_name: string;
  details: string;
  timestamp: string;
}

export interface ChangeLogResponse {
  total_records: number;
  filters: Record<string, unknown>;
  data: ChangeLogEntry[];
}

export interface EnrollmentStatsSubject {
  subject: string;
  count: number;
}

export interface EnrollmentStatsSection {
  section: string;
  total: number;
  by_subject: EnrollmentStatsSubject[];
}

export interface EnrollmentStatsClass {
  class_name: string;
  total: number;
  by_section: EnrollmentStatsSection[];
}

export interface EnrollmentStatsSchool {
  school_name: string;
  total: number;
  by_class: EnrollmentStatsClass[];
}

export interface EnrollmentStatsResponse {
  total_students: number;
  by_school: EnrollmentStatsSchool[];
}

export interface DeleteResponse {
  message: string;
  [key: string]: unknown;
}

// ── Holidays ──────────────────────────────────────────────────────────────────

export interface HolidayItem {
  id: number;
  date: string; // DD-MM-YYYY
  name: string | null;
}

export interface HolidayListResponse {
  school_name: string;
  session: string;
  total: number;
  holidays: HolidayItem[];
}

export interface HolidayCreateRequest {
  school_name?: string;
  session: string;
  name?: string;
  dates: string[]; // DD-MM-YYYY
}

export interface HolidayCreateResponse {
  school_name: string;
  session: string;
  submitted: number;
  inserted: number;
}

// ── Leave requests ────────────────────────────────────────────────────────────

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequestItem {
  id: number;
  roll_no: string;
  student_name: string | null;
  class_name: string | null;
  section: string | null;
  session: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  review_note: string | null;
  created_at: string | null;
  reviewed_at: string | null;
}

export interface LeaveListResponse {
  total: number;
  data: LeaveRequestItem[];
}

export interface LeaveCreateRequest {
  school_name?: string;
  session?: string;
  roll_no?: string;
  class_name?: string;
  section?: string;
  start_date: string; // DD-MM-YYYY
  end_date: string; // DD-MM-YYYY
  reason?: string;
}

export interface LeaveCreateResponse {
  id: number;
  roll_no: string;
  status: LeaveStatus;
  start_date: string;
  end_date: string;
}

export interface LeaveReviewRequest {
  school_name?: string;
  decision: "approved" | "rejected";
  review_note?: string;
}

export interface LeaveReviewResponse {
  id: number;
  status: LeaveStatus;
  roll_no: string;
  days_marked_excused: number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardResponse {
  school_name: string;
  session: string;
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  half_day: number;
  total_marked: number;
  total_enrolled: number;
  classes_marked: number;
  attendance_percentage: number;
}

// ── Dashboard analytics ───────────────────────────────────────────────────────

export interface AnalyticsToday {
  present: number;
  absent: number;
  late: number;
  excused: number;
  half_day: number;
  total_marked: number;
  total_enrolled: number;
  classes_marked: number;
  attendance_percentage: number;
}

export interface AnalyticsTrendPoint {
  date: string; // DD-MM-YYYY
  present: number;
  absent: number;
  late: number;
  excused: number;
  half_day: number;
  total_marked: number;
  percentage: number;
}

export interface LowAttendanceStudent {
  roll_no: string;
  student_name: string | null;
  class_name: string | null;
  section: string | null;
  attended_days: number;
  working_days: number;
  percentage: number;
}

export interface UnmarkedClass {
  class_name: string | null;
  section: string | null;
  enrolled: number;
}

export interface AnalyticsResponse {
  school_name: string;
  session: string;
  date: string;
  scope: "school" | "class";
  classes_in_scope: string[];
  is_holiday_today: boolean;
  today: AnalyticsToday;
  week_percentage: number | null;
  prev_week_percentage: number | null;
  trend: AnalyticsTrendPoint[];
  low_attendance: LowAttendanceStudent[];
  pending_leaves_total: number;
  pending_leaves: LeaveRequestItem[];
  unmarked_classes: UnmarkedClass[];
}
