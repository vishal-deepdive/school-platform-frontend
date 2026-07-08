import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/store/auth";
import { useActiveSchoolStore } from "@/shared/store/activeSchool";

export interface ActiveSchoolContext {
  /** True when the signed-in user is a platform admin. */
  isAdmin: boolean;
  /** Effective school id: the admin's picked school, or the user's own school. */
  schoolId: string | undefined;
  /**
   * Effective school name. Only populated for admins (from their selection);
   * non-admins are scoped server-side and never send a name, so this stays "".
   */
  schoolName: string;
  /** False only when an admin has not yet picked a school. */
  ready: boolean;
  /**
   * Convenience query params for the `school_name`-based endpoints (attendance,
   * recording, survey). Empty for non-admins so the server infers their scope.
   */
  schoolParam: Record<string, string>;
}

/**
 * The single source of truth for "which school am I operating on" across every
 * module. Replaces the per-page `isAdmin + useSchoolSearch + local schoolId`
 * blocks: admins read their globally-selected school; everyone else is
 * transparently scoped to their own `school_id` exactly as before.
 */
export function useActiveSchool(): ActiveSchoolContext {
  const user = useAuthStore((s) => s.user);
  const selected = useActiveSchoolStore((s) => s.school);
  const isAdmin = user?.role === "admin";
  const ownSchoolId = user?.school_id ?? undefined;

  return useMemo<ActiveSchoolContext>(() => {
    if (isAdmin) {
      const schoolParam: Record<string, string> = selected?.name
        ? { school_name: selected.name }
        : {};
      return {
        isAdmin: true,
        schoolId: selected?.id,
        schoolName: selected?.name ?? "",
        ready: !!selected,
        schoolParam,
      };
    }
    return {
      isAdmin: false,
      schoolId: ownSchoolId,
      schoolName: "",
      ready: true,
      schoolParam: {},
    };
  }, [isAdmin, selected, ownSchoolId]);
}
