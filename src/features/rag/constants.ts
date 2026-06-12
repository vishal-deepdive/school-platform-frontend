import type { SelectOption } from "@/shared/types/common";

/** Sentinel value for the "Other…" subject choice (reveals a free-text box). */
export const RAG_OTHER_SUBJECT = "__other__";

/**
 * Curated list of common school subjects for the upload form. Keeps the
 * knowledge-base subject vocabulary consistent while still allowing anything
 * through the "Other…" escape hatch.
 */
export const SUBJECT_OPTIONS: SelectOption[] = [
  { value: "Mathematics", label: "Mathematics" },
  { value: "Science", label: "Science" },
  { value: "Physics", label: "Physics" },
  { value: "Chemistry", label: "Chemistry" },
  { value: "Biology", label: "Biology" },
  { value: "Social Science", label: "Social Science" },
  { value: "History", label: "History" },
  { value: "Geography", label: "Geography" },
  { value: "Civics", label: "Civics" },
  { value: "Economics", label: "Economics" },
  { value: "English", label: "English" },
  { value: "Hindi", label: "Hindi" },
  { value: "Sanskrit", label: "Sanskrit" },
  { value: "Computer Science", label: "Computer Science" },
  { value: "Environmental Studies (EVS)", label: "Environmental Studies (EVS)" },
  { value: "General Knowledge", label: "General Knowledge" },
  { value: RAG_OTHER_SUBJECT, label: "Other…" },
];
