import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolClassesApi } from "@/shared/api/schoolClasses";
import type { SchoolClass } from "@/shared/api/schoolClasses";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { formatClassName } from "@/shared/lib/utils";
import type { SelectOption } from "@/shared/types/common";
import {
  referenceDataMeta,
  REFERENCE_DATA_STALE_TIME,
  REFERENCE_DATA_GC_TIME,
} from "@/shared/api/queryPersistence";

export const schoolClassesKeys = {
  all: ["school", "classes"] as const,
  roster: (schoolId: string | undefined, includeInactive: boolean) =>
    ["school", "classes", schoolId ?? "none", includeInactive ? "all" : "active"] as const,
  usage: (schoolId: string | undefined) => ["school", "classes", "usage", schoolId ?? "none"] as const,
};

export interface UseSchoolClassesResult {
  /** Raw roster rows, already ordered by grade. */
  classes: SchoolClass[];
  /** Ready-to-use `<Select>` options for the class picker. */
  classOptions: SelectOption[];
  /** Sections defined for one class; empty means "no sections on the roster". */
  getSectionOptions: (className: string) => SelectOption[];
  isLoading: boolean;
  /** True once loaded and the school has no classes on its roster. */
  isEmpty: boolean;
  /** True while an admin has not picked a school yet — not an error state. */
  needsSchool: boolean;
  error: unknown;
}

/**
 * The one source of class and section options for the whole frontend.
 *
 * Resolves the school the same way everything else does — `useActiveSchool()`, so
 * an admin gets the school selected on the dashboard and everyone else their own —
 * and reads that school's roster from `GET /school/classes`.
 *
 * Cached through React Query with the shared reference-data lifetimes (10 min
 * fresh, persisted to sessionStorage), so the many pickers on a page share one
 * request and a reload inside the same tab doesn't refetch. Mutating the roster
 * invalidates `schoolClassesKeys.all`, so every open picker updates at once.
 *
 * An empty roster is reported as `isEmpty` rather than filled in with a generic
 * Nursery–12 list — callers show a setup hint instead (see `ClassSelect`).
 */
export function useSchoolClasses(
  options: { includeInactive?: boolean; schoolId?: string } = {},
): UseSchoolClassesResult {
  const { includeInactive = false, schoolId: schoolIdOverride } = options;
  const active = useActiveSchool();
  const schoolId = schoolIdOverride ?? active.schoolId;

  const { data, isLoading, error } = useQuery({
    queryKey: schoolClassesKeys.roster(schoolId, includeInactive),
    queryFn: () => schoolClassesApi.getRoster(schoolId, includeInactive),
    enabled: !!schoolId,
    staleTime: REFERENCE_DATA_STALE_TIME,
    gcTime: REFERENCE_DATA_GC_TIME,
    meta: referenceDataMeta,
  });

  const classes = useMemo(() => data?.classes ?? [], [data]);

  const classOptions = useMemo<SelectOption[]>(
    () =>
      classes.map((c) => ({
        value: c.class_name,
        label: formatClassName(c.class_name),
      })),
    [classes],
  );

  const getSectionOptions = useCallback(
    (className: string): SelectOption[] => {
      if (!className) return [];
      const match = classes.find((c) => c.class_name === className);
      return (match?.sections ?? []).map((section) => ({
        value: section,
        label: section,
      }));
    },
    [classes],
  );

  return {
    classes,
    classOptions,
    getSectionOptions,
    isLoading: !!schoolId && isLoading,
    isEmpty: !!schoolId && !isLoading && !error && classes.length === 0,
    needsSchool: !schoolId,
    error,
  };
}

/** Invalidate every cached roster view after a roster mutation. */
export function useInvalidateSchoolClasses() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: schoolClassesKeys.all }),
    [queryClient],
  );
}
