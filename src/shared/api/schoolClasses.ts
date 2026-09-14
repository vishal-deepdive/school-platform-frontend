import { apiClient } from "@/shared/api/client";
import { API_V1 } from "@/shared/config/apiVersion";

const BASE = `${API_V1}/school`;

/** One class on a school's roster, with the sections it runs. */
export interface SchoolClass {
  id: string;
  class_name: string;
  sections: string[];
  sort_order: number;
  is_active: boolean;
}

export interface SchoolClassRoster {
  school_id: string;
  classes: SchoolClass[];
}

export interface ClassRosterEntryInput {
  class_name: string;
  sections: string[];
}

/**
 * The school class roster — the single source of truth for every class and
 * section dropdown in the app.
 *
 * Before this existed, attendance and recording read `class_codes` (student join
 * codes, so a class vanished from the picker once its code expired), RAG read the
 * school's onboarding grade range, and several screens hardcoded Nursery–12.
 * Nothing should read those for class options any more.
 *
 * `school_id` is optional: the backend infers it from the JWT for everyone except
 * admins, who must pass the school they have selected on the dashboard.
 */
export const schoolClassesApi = {
  getRoster: (schoolId?: string, includeInactive = false) =>
    apiClient
      .get<SchoolClassRoster>(`${BASE}/classes`, {
        params: {
          ...(schoolId ? { school_id: schoolId } : {}),
          ...(includeInactive ? { include_inactive: true } : {}),
        },
      })
      .then((r) => r.data),

  /** Row counts per class label, so the editor can warn before removing one. */
  getUsage: (schoolId?: string) =>
    apiClient
      .get<{ usage: Record<string, number> }>(`${BASE}/classes/usage`, {
        params: schoolId ? { school_id: schoolId } : undefined,
      })
      .then((r) => r.data.usage),

  /** Replace the whole roster. Classes left out are deactivated, not deleted. */
  replaceRoster: (classes: ClassRosterEntryInput[], schoolId?: string) =>
    apiClient
      .put<SchoolClassRoster>(
        `${BASE}/classes`,
        { classes },
        { params: schoolId ? { school_id: schoolId } : undefined },
      )
      .then((r) => r.data),

  addClass: (className: string, sections: string[] = [], schoolId?: string) =>
    apiClient
      .post<SchoolClass>(`${BASE}/classes`, null, {
        params: {
          class_name: className,
          ...(sections.length ? { section: sections } : {}),
          ...(schoolId ? { school_id: schoolId } : {}),
        },
      })
      .then((r) => r.data),

  updateSections: (className: string, sections: string[], schoolId?: string) =>
    apiClient
      .patch<SchoolClass>(
        `${BASE}/classes`,
        { sections },
        {
          params: {
            class_name: className,
            ...(schoolId ? { school_id: schoolId } : {}),
          },
        },
      )
      .then((r) => r.data),

  removeClass: (className: string, schoolId?: string) =>
    apiClient
      .delete<{ message: string }>(`${BASE}/classes`, {
        params: {
          class_name: className,
          ...(schoolId ? { school_id: schoolId } : {}),
        },
      })
      .then((r) => r.data),
};
