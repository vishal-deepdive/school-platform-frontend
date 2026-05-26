/**
 * AuthCallbackPage
 *
 * Handles the Google OAuth2 callback (GET /auth/callback?code=...&state=...).
 *
 * For **new users** the google_signup session is stored in sessionStorage
 * (never the URL) and the user is redirected to /complete-profile.
 * sessionStorage keys:
 *   - google_signup_session  → JSON { google_token, email, full_name, avatar_url }
 *
 * For **existing users** tokens are issued immediately and the user is sent to /.
 */
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { decodeJwt } from '@/lib/jwt'
import toast from 'react-hot-toast'
import type { User } from '@/types/auth'
import { getErrorMessage } from '@/lib/utils'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      toast.error(`Google login failed: ${error}`)
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
          // Store the signup session in sessionStorage — never in the URL.
          // This keeps the google_token and PII out of browser history / server logs.
          sessionStorage.setItem(
            'google_signup_session',
            JSON.stringify({
              google_token: result.google_token,
              email: result.email,
              full_name: result.full_name ?? null,
              avatar_url: result.avatar_url ?? null,
            }),
          )
          navigate('/complete-profile', { replace: true })
          return
        }

        // Existing user — tokens issued immediately.
        const decoded = decodeJwt(result.access_token)
        const user: User = {
          id: decoded?.sub ?? '',
          email: decoded?.email ?? '',
          full_name: null,
          role: decoded?.role ?? 'viewer',
          school_id: decoded?.school_id ?? null,
          is_active: true,
          is_email_verified: true,
          avatar_url: decoded?.avatar_url ?? null,
        }
        login(result, user)
        toast.success('Successfully logged in with Google')
        navigate('/', { replace: true })
      } catch (err) {
        toast.error(getErrorMessage(err))
        navigate('/login', { replace: true })
      }
    }

    processCallback()
  }, [searchParams, navigate, login])

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      <p className="mt-4 text-sm text-gray-500 font-medium">Completing login…</p>
    </div>
  )
}
