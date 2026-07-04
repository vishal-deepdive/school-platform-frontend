import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/auth";
import type { ClassCodeItem } from "@/features/auth/types";

export const schoolClassesKeys = {
  bySchool: (schoolId: string) => ["auth", "schoolClasses", schoolId] as const,
};

/**
 * Fetches class codes for a school via React Query so multiple components
 * on the same page share a single request and the result is cached for 5 min.
 */
export function useSchoolClassesQuery(schoolId: string | undefined): {
  data: ClassCodeItem[];
  isLoading: boolean;
} {
  const { data = [], isLoading } = useQuery({
    queryKey: schoolClassesKeys.bySchool(schoolId ?? ""),
    queryFn: () => authApi.getSchoolClasses(schoolId!),
    enabled: !!schoolId,
    staleTime: 5 * 60_000,
  });
  return { data, isLoading };
}
