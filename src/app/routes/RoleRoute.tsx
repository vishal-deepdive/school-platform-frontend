import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/auth";
import type { UserRole } from "@/features/auth/types";
import { ROUTE_ROLES } from "@/shared/lib/permissions";

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

  if (roles && (!user || !roles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
