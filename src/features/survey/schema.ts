import { z } from "zod";

export const surveySearchSchema = z.object({
  query: z.string().min(1, "Query is required").max(2000),
});

export type SurveySearchFormData = z.infer<typeof surveySearchSchema>;
