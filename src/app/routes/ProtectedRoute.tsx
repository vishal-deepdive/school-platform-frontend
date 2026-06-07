import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

/**
 * Gate for all app routes.
 *
 * Checks in order:
 *  1. Not authenticated → redirect to /login
 *  2. Authenticated but profile incomplete (school_id missing, role is not admin)
 *     → redirect to /complete-profile so the user can finish their Google OAuth
 *       profile-completion flow without first being bounced to /login.
 *
 *  The /complete-profile page handles its own "no signup session" state and
 *  offers a "Sign in with Google" button if sessionStorage is empty.
 */
export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Platform admins are not tied to a school — they always pass through.
  const isAdmin = user?.role === 'admin'

  // A non-admin user with no school_id has an incomplete profile.
  // Send them to /complete-profile. That page shows a Google sign-in prompt if
  // the signup session is gone (e.g. after a page refresh or new tab).
  if (!isAdmin && user && !user.school_id) {
    return <Navigate to="/complete-profile" replace />
  }

  return <Outlet />
}
