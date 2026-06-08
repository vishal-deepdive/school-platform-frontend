import { z } from "zod";

export const markAttendanceSchema = z.object({
  school_name: z.string().min(1, "School name is required"),
  class_name: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  subject: z.string().optional(),
  threshold: z.number().min(0).max(1).default(0.3),
  session: z.string().optional(),
});

export const enrollSchema = z.object({
  school_name: z.string().min(1, "School name is required"),
  session: z.string().min(1, "Session is required"),
  class_name: z.string().optional(),
  section: z.string().optional(),
  subject: z.string().optional(),
});

export type MarkAttendanceFormData = z.infer<typeof markAttendanceSchema>;
export type EnrollFormData = z.infer<typeof enrollSchema>;
