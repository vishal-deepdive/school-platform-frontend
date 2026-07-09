import { useAuthStore } from "@/features/auth/store/auth";
import { roleCanAccess } from "@/shared/lib/permissions";

/**
 * True if the current user's role may access `path` per ROUTE_ROLES. The single
 * hook for declarative, in-component role gating — keeps button/section
 * visibility reading from the same source of truth as the route guard and
 * sidebar, instead of scattered `role === "admin" || …` string comparisons.
 */
export function useCan(path: string): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return roleCanAccess(path, role);
}
