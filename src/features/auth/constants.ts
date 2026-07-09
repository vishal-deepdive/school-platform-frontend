import type { SelectOption } from "@/shared/types/common";

export const RELATION_OPTIONS: SelectOption[] = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
];

/**
 * localStorage flag set the moment a teacher completes invite registration.
 * The Dashboard's TeacherWelcomeCard shows a one-time getting-started card when
 * it's present, then clears it. Kept here so the writer (invite form) and the
 * reader (dashboard card) can't drift on the key.
 */
export const TEACHER_WELCOME_FLAG = "deepdive:new-teacher-welcome";
