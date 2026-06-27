import { z } from "zod";

export const surveySearchSchema = z.object({
  query: z.string().min(1, "Query is required").max(2000),
  school_id: z.string().optional(),
  class_name: z.string().min(1, "Class is required").max(50),
  feedback_column: z.enum([
    "teacher_feedback",
    "school_feedback",
    "school_suggestions",
  ]),
  limit: z.number().min(1).max(100).default(10),
});

export type SurveySearchFormData = z.infer<typeof surveySearchSchema>;
