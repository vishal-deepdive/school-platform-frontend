export type AttendanceStatus = 'P' | 'A'

export interface EnrolledStudent {
  roll_no: string
  name: string
  images_processed: number
}

export interface SkippedEntry {
  folder: string
  reason: string
}

export interface EnrollResponse {
  enrolled_students: EnrolledStudent[]
  school_name: string
  session: string
  class_name: string | null
  section: string | null
  subject: string | null
  endpoint: string
  skipped?: SkippedEntry[]
}

export interface UpdatedStudent {
  roll_no: string
  name: string
  images_processed: number
  action: 'updated' | 'added'
}

export interface UpdateEmbeddingResponse {
  school_name: string
  session: string
  alpha: number
  updated_count: number
  added_count: number
  updated_students: UpdatedStudent[]
  added_students: UpdatedStudent[]
  skipped?: SkippedEntry[]
}

export interface AttendanceRecord {
  roll_no: string
  name: string
  similarity?: number
  status: AttendanceStatus
}

export interface MarkAttendanceResponse {
  school_name: string
  class_name: string
  section: string
  subject: string | null
  session: string
  date: string
  time: string
  total_enrolled: number
  present_count: number
  absent_count: number
  present_students: AttendanceRecord[]
  absent_students: AttendanceRecord[]
}

export interface AttendanceDateResponse {
  total_records: number
  date: string
  school_name: string
  data: Record<string, unknown>[]
}

export interface AttendanceRangeStudent {
  name: string
  roll_no: string
  attendance_percentage: number
  dates: Record<string, AttendanceStatus>
  below_75_percent: boolean
}

export interface AttendanceRangeResponse {
  total_students: number
  date_range: string
  dates: string[]
  school_name: string
  data: AttendanceRangeStudent[]
}

export interface ChangeLogEntry {
  school_name: string
  class_name: string
  section: string
  subject: string
  roll_no: string
  session: string
  change_type: string
  endpoint_name: string
  details: string
  timestamp: string
}

export interface ChangeLogResponse {
  total_records: number
  filters: Record<string, unknown>
  data: ChangeLogEntry[]
}

export interface EnrollmentStatsResponse {
  total_students: number
  by_school: Record<string, unknown>[]
}

export interface DeleteResponse {
  message: string
  [key: string]: unknown
}
