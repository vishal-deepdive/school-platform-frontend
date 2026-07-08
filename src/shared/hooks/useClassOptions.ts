import { useMemo, useCallback } from "react";
import { useSchoolClassesQuery } from "./useSchoolClassesQuery";
import { sortClassesDescending, formatClassName } from "@/shared/lib/utils";
import type { SelectOption } from "@/shared/types/common";

/**
 * Loads class codes for a school and derives Class/Section dropdown options.
 * Backed by React Query so multiple components on the same page share one
 * fetch and the result is cached for 5 min.
 *
 * Section options cascade from the selected class — a class with no defined
 * sections yields an empty list, signalling callers to fall back to a free
 * text "Section" input for that class.
 */
export function useClassOptions(schoolId: string | undefined) {
  const { data: classes, isLoading } = useSchoolClassesQuery(schoolId);

  const classNameOptions: SelectOption[] = useMemo(() => {
    const names = Array.from(new Set(classes.map((c) => c.class_name)));
    return sortClassesDescending(names).map((name) => ({
      value: name,
      label: formatClassName(name),
    }));
  }, [classes]);

  const getSectionOptions = useCallback(
    (className: string): SelectOption[] => {
      const sections = classes
        .filter((c) => c.class_name === className && c.section)
        .map((c) => c.section as string);
      return Array.from(new Set(sections))
        .sort()
        .map((section) => ({ value: section, label: section }));
    },
    [classes],
  );

  return { classes, classNameOptions, getSectionOptions, isLoading };
}
