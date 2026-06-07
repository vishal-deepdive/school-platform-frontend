import { z } from "zod";

export const qaSchema = z.object({
  query: z.string().min(1, "Query is required").max(2000),
});

export type QAFormData = z.infer<typeof qaSchema>;
