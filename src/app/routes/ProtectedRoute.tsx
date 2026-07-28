import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/auth";

/**
 * Gate for all app routes.
 *
 * Checks in order:
 *  1. Not authenticated → redirect to /login
 *  2. Authenticated but profile incomplete (school_id missing, role is not admin)
 *     → redirect to /complete-profile so the user can finish their Google OAuth
 *       profile-completion flow without first being bounced to /login.
 *  3. Authenticated but must_change_password (a student still on their
 *     school-issued DOB default) → redirect to /set-password. Runs on EVERY
 *     render this component makes, not just right after login — catches a
 *     direct URL navigation, browser back button, or stale tab just as it
 *     catches the initial post-login bounce, regardless of which of the
 *     several login forms authenticated the user.
 *
 *  Both /complete-profile and /set-password live under AuthLayout (outside
 *  this gate's own subtree), so re-entering them mid-flow (e.g. a refresh)
 *  works even though this component itself doesn't run there.
 */
export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Platform admins are not tied to a school — they always pass through.
  const isAdmin = user?.role === "admin";

  // A non-admin user with no school_id has an incomplete profile.
  // Send them to /complete-profile. That page shows a Google sign-in prompt if
  // the signup session is gone (e.g. after a page refresh or new tab).
  if (!isAdmin && user && !user.school_id) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (user?.must_change_password) {
    return <Navigate to="/set-password" replace />;
  }

  return <Outlet />;
}
