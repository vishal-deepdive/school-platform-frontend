import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

/**
 * Gate for all app routes.
 *
 * Two checks in order:
 *  1. Not authenticated → redirect to /login
 *  2. Authenticated but profile incomplete (no school_id and role is not admin)
 *     → redirect to /login with a toast-friendly explanation.
 *     This covers edge-cases where old Google-OAuth users exist in the DB
 *     with school_id = null due to the pre-fix flow.
 */
export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Platform admins are not tied to a school — they always pass through.
  const isAdmin = user?.role === 'admin'

  // If a user somehow has no school_id (e.g. created by old Google OAuth code)
  // and is not an admin, they can't meaningfully use the app.
  // Redirect to login so they can re-authenticate with the corrected flow.
  if (!isAdmin && user && !user.school_id) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          incompleteProfile: true,
        }}
        replace
      />
    )
  }

  return <Outlet />
}
