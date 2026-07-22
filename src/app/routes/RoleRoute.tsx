import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/auth";
import type { UserRole } from "@/features/auth/types";
import { ROUTE_ROLES } from "@/shared/lib/permissions";
import toast from "@/shared/lib/toast";

interface RoleRouteProps {
  children: ReactNode;
  /**
   * Roles allowed to view this route. If omitted, the allowed set is looked up
   * from ROUTE_ROLES by the current pathname, keeping the guard in lock-step
   * with the sidebar's visibility rules.
   */
  allow?: UserRole[];
}

/**
 * Per-route authorization guard. Renders the route only if the authenticated
 * user's role is permitted; otherwise redirects to the dashboard. Authentication
 * itself is handled upstream by ProtectedRoute — this layer adds role checks the
 * SPA previously lacked (it only distinguished admin vs. everyone-else).
 */
export function RoleRoute({ children, allow }: RoleRouteProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const roles = allow ?? ROUTE_ROLES[location.pathname];

  // The implicit lookup is an exact pathname match against ROUTE_ROLES, so a
  // dynamic segment (e.g. `/foo/:id`) or a trailing slash silently resolves to
  // undefined → default-deny. That is safe, but easy to trip over: warn in dev
  // so a mis-wired route is obvious instead of an inexplicable bounce. Routes
  // with dynamic params must pass an explicit `allow` prop.
  if (import.meta.env.DEV && !allow && !ROUTE_ROLES[location.pathname]) {
    console.warn(
      `[RoleRoute] No ROUTE_ROLES entry for "${location.pathname}" and no explicit ` +
        `allow prop — this route will default-deny. Add it to ROUTE_ROLES or pass allow={[…]}.`,
    );
  }

  const wrongRole = !!user && (!roles || !roles.includes(user.role));

  useEffect(() => {
    // Only the "authenticated but wrong role" case is worth telling the user
    // about — a missing `user` means auth hasn't resolved yet (ProtectedRoute
    // handles that upstream), so a toast there would be noise, not signal.
    if (wrongRole) {
      toast.error("You don't have access to that page.");
    }
  }, [location.pathname, wrongRole]);

  if (!roles || !user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
