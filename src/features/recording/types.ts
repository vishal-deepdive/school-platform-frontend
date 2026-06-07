export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "not_found";

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress?: string;
  error?: string;
  result?: unknown;
}

export interface Recording {
  id: string;
  date: string;
  school_name: string;
  class: string;
  section?: string;
  subject?: string;
  recording_subject?: string;
  audio_filename: string;
  job_id?: string;
  created_at?: string;
}

export interface RecordingsListResponse {
  recordings: Recording[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLog {
  id: string;
  date: string;
  school_name: string;
  class_name: string;
  section?: string;
  subject?: string;
  recording_subject?: string;
  audio_filename: string;
  job_id?: string;
  activity: string;
  activity_timestamp?: string;
  created_at?: string;
}

export interface AuditLogsListResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface DeleteRecordingResponse {
  message: string;
  record_id: string;
}

export interface SearchResultItem {
  id: string;
  date?: string;
  school_name: string;
  class?: string;
  section?: string;
  subject?: string;
  recording_subject?: string;
  job_id?: string;
  similarity?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
}
