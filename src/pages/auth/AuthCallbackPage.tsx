/**
 * AuthCallbackPage
 *
 * Handles the Google OAuth2 callback (GET /auth/callback?code=...&state=...).
 *
 * For **new users** the google_signup session is stored in sessionStorage
 * (never the URL) via session.ts helpers, then the user is redirected to /complete-profile.
 *
 * For **existing users** tokens are issued immediately and the user is sent to /.
 */
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { decodeJwt, buildUserFromJwt } from '@/lib/jwt'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/lib/utils'
import { SESSION_KEYS, writeSession } from '@/lib/session'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code  = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      // Map known OAuth error codes; don't render the raw param value
      const msg = error === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google login failed.'
      toast.error(msg)
      navigate('/login', { replace: true })
      return
    }

    if (!code || !state) {
      toast.error('Invalid callback parameters')
      navigate('/login', { replace: true })
      return
    }

    const processCallback = async () => {
      try {
        const result = await authApi.googleCallback(code, state)

        if (result.status === 'registration_required') {
          writeSession(SESSION_KEYS.GOOGLE_SIGNUP, {
            google_token: result.google_token,
            email:        result.email,
            full_name:    result.full_name ?? null,
            avatar_url:   result.avatar_url ?? null,
          })
          navigate('/complete-profile', { replace: true })
          return
        }

        // Existing user — tokens issued immediately
        login(result, buildUserFromJwt(decodeJwt(result.access_token), ''))
        toast.success('Successfully logged in with Google')
        navigate('/dashboard', { replace: true })
      } catch (err) {
        toast.error(getErrorMessage(err))
        navigate('/login', { replace: true })
      }
    }

    processCallback()
  }, [searchParams, navigate, login])

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      <p className="mt-4 text-sm text-gray-500 font-medium">Completing login…</p>
    </div>
  )
}
