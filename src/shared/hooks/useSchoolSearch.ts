import { useState, useEffect } from "react";
import { authApi } from "@/features/auth/api/auth";
import { useDebounce } from "./useDebounce";
import { useSchoolClassesQuery } from "./useSchoolClassesQuery";
import { formatClassName, getClassNameWeight } from "@/shared/lib/utils";
import type { SearchableSelectOption } from "@/shared/components/ui/SearchableSelect";
import type { SchoolSearchItem } from "@/features/auth/types";

/** Searches schools by query string with debouncing. */
export function useSchoolSearch(debounceMs = 500) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, debounceMs);
  const [schools, setSchools] = useState<SchoolSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // If user typed 1 character, wait until they type more
    if (debouncedQuery.length === 1) {
      setSchools([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    authApi
      .searchSchools(debouncedQuery)
      .then((results) => {
        if (!cancelled) setSchools(results);
      })
      .catch(() => {
        /* silently ignore — search errors don't block registration */
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const options: SearchableSelectOption[] = schools.map((s) => ({
    label: s.name,
    value: s.id,
    sublabel: [s.address, s.city, s.state, s.pin_code]
      .filter(Boolean)
      .join(", "),
  }));

  return { query, setQuery, options, isSearching };
}

/** Loads class codes for a given school ID, backed by React Query for shared caching. */
export function useSchoolClasses(schoolId: string | undefined) {
  const { data: classes, isLoading } = useSchoolClassesQuery(schoolId);

  const options: SearchableSelectOption[] = classes
    .map((c) => ({
      label: formatClassName(c.class_name),
      value: c.code,
      sublabel: c.section ? `Section ${c.section}` : undefined,
    }))
    .sort((a, b) => {
      const weightDiff = getClassNameWeight(b.label) - getClassNameWeight(a.label);
      if (weightDiff !== 0) return weightDiff;
      return a.label.localeCompare(b.label);
    });

  return { options, isLoading };
}
