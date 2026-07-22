import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/auth";
import type { ClassCodeItem } from "@/features/auth/types";
import {
  referenceDataMeta,
  REFERENCE_DATA_STALE_TIME,
  REFERENCE_DATA_GC_TIME,
} from "@/shared/api/queryPersistence";

export const schoolClassesKeys = {
  bySchool: (schoolId: string | undefined) => ["auth", "schoolClasses", schoolId] as const,
};

/**
 * Fetches class codes for a school via React Query so multiple components
 * on the same page share a single request. Class codes rarely change, so the
 * result is also persisted to sessionStorage — a reload within the same tab
 * reuses the cached list instead of re-hitting the backend.
 */
export function useSchoolClassesQuery(schoolId: string | undefined): {
  data: ClassCodeItem[];
  isLoading: boolean;
} {
  const { data = [], isLoading } = useQuery({
    queryKey: schoolClassesKeys.bySchool(schoolId),
    queryFn: () => {
      if (!schoolId) {
        return [];
      }
      return authApi.getSchoolClasses(schoolId);
    },
    enabled: !!schoolId,
    staleTime: REFERENCE_DATA_STALE_TIME,
    gcTime: REFERENCE_DATA_GC_TIME,
    meta: referenceDataMeta,
  });
  return { data, isLoading };
}
