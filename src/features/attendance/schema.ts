import { z } from "zod";

export const markAttendanceSchema = z.object({
  school_name: z.string().optional(),
  class_name: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  subject: z.string().optional(),
  // Server clamps the effective threshold up to a 0.35 floor; mirror that here.
  threshold: z.number().min(0.35).max(1).default(0.4),
  session: z.string().optional(),
  attendance_date: z.string().optional(),
  allow_holiday: z.boolean().default(false),
});

export const enrollSchema = z.object({
  school_name: z.string().optional(),
  session: z.string().min(1, "Session is required"),
  // Class + section are required: enrollment writes a roster keyed by class/section,
  // the backend rejects an unscoped enroll (teachers must name an assigned class),
  // and mark-attendance requires the same pair — keep them consistent.
  class_name: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  subject: z.string().optional(),
});

export const correctAttendanceSchema = z.object({
  school_name: z.string().optional(),
  class_name: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  subject: z.string().optional(),
  session: z.string().optional(),
  roll_no: z.string().min(1, "Roll number is required"),
  status: z.enum(["P", "A", "L", "E", "H"]),
  attendance_date: z.string().optional(),
  allow_holiday: z.boolean().default(false),
});

export type MarkAttendanceFormData = z.infer<typeof markAttendanceSchema>;
export type EnrollFormData = z.infer<typeof enrollSchema>;
export type CorrectAttendanceFormData = z.infer<typeof correctAttendanceSchema>;
