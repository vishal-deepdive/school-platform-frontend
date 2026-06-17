import { useState, useEffect, useMemo, useCallback } from "react";
import { authApi } from "@/features/auth/api/auth";
import { sortClassesDescending } from "@/shared/lib/utils";
import type { ClassCodeItem } from "@/features/auth/types";
import type { SelectOption } from "@/shared/types/common";

/**
 * Loads class codes for a school and derives Class/Section dropdown options.
 *
 * Section options cascade from the selected class — a class with no defined
 * sections yields an empty list, signalling callers to fall back to a free
 * text "Section" input for that class.
 */
export function useClassOptions(schoolId: string | undefined) {
  const [classes, setClasses] = useState<ClassCodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!schoolId) {
      setClasses([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    authApi
      .getSchoolClasses(schoolId)
      .then((results) => {
        if (!cancelled) setClasses(results);
      })
      .catch(() => {
        /* silently ignore — falls back to empty options */
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const classNameOptions: SelectOption[] = useMemo(() => {
    const names = Array.from(new Set(classes.map((c) => c.class_name)));
    return sortClassesDescending(names).map((name) => ({
      value: name,
      label: name,
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
