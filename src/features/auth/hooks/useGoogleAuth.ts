import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { SESSION_KEYS } from '@/lib/session'

interface GoogleAuthOptions {
  role?: 'student' | 'teacher' | 'parent'
  inviteToken?: string
  schoolId?: string
}

/**
 * Encapsulates the Google OAuth redirect flow.
 * Hints are written to sessionStorage AFTER a valid auth_url is received so that
 * a failed API call never leaves stale hints that corrupt the next OAuth attempt.
 */
export function useGoogleAuth() {
  const handleGoogleLogin = async (options: GoogleAuthOptions = {}) => {
    try {
      const { auth_url } = await authApi.googleLogin()
      if (options.role)        sessionStorage.setItem(SESSION_KEYS.PENDING_ROLE, options.role)
      if (options.inviteToken) sessionStorage.setItem(SESSION_KEYS.PENDING_INVITE_TOKEN, options.inviteToken)
      if (options.schoolId)    sessionStorage.setItem(SESSION_KEYS.PENDING_SCHOOL_ID, options.schoolId)
      window.location.href = auth_url
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return { handleGoogleLogin }
}
