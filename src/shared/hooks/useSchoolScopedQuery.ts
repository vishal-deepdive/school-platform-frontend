import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";

/** The active-school context handed to a scoped query's `queryFn`. */
export interface SchoolScope {
  /** True when the signed-in user is a platform admin. */
  isAdmin: boolean;
  /** Effective school id (the admin's pick, or the user's own). */
  schoolId?: string;
  /** Effective school name — only populated for admins (empty otherwise). */
  schoolName: string;
  /**
   * `{ school_name }` for the query-param endpoints, or `{}` for non-admins and
   * unselected admins. Spread straight into an API params object.
   */
  schoolParam: Record<string, string>;
}

interface SchoolScopedQueryOptions<T> {
  /**
   * Stable key prefix. The active school id (or `"platform"`) is appended
   * automatically, so switching schools always produces a distinct cache entry.
   */
  key: readonly unknown[];
  /** Receives the resolved {@link SchoolScope} so the endpoint can be scoped. */
  queryFn: (scope: SchoolScope) => Promise<T>;
  staleTime?: number;
  retry?: boolean | number;
  enabled?: boolean;
  /**
   * When true, an admin who has not yet picked a school is *gated*: the query is
   * disabled and `needsSchool` is returned as true so the caller can render a
   * "select a school" prompt instead of platform-wide data. Non-admins (scoped
   * server-side) are never gated.
   */
  requireSchool?: boolean;
}

/**
 * `useQuery`, with the active school folded in for free — the single primitive
 * every school-scoped read should use.
 *
 * It (1) appends the school id to the query key so a school switch refetches and
 * caches per-school, (2) hands the resolved school context to `queryFn`, and
 * (3) optionally gates admins who haven't selected a school (`requireSchool`).
 * This replaces the copy-pasted `useActiveSchool` + manual-key + `needsSchool`
 * block that every scoped view used to repeat.
 */
export function useSchoolScopedQuery<T>(
  opts: SchoolScopedQueryOptions<T>,
): UseQueryResult<T> & { needsSchool: boolean } {
  const { isAdmin, ready, schoolId, schoolName, schoolParam } = useActiveSchool();
  const needsSchool = Boolean(opts.requireSchool) && isAdmin && !ready;

  const result = useQuery({
    queryKey: [...opts.key, schoolId ?? "platform"],
    queryFn: () => opts.queryFn({ isAdmin, schoolId, schoolName, schoolParam }),
    staleTime: opts.staleTime,
    retry: opts.retry,
    enabled: (opts.enabled ?? true) && !needsSchool,
  });

  return Object.assign(result, { needsSchool });
}
