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
      toast.error(`Google Login failed: ${error}`)
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
        const tokens = await authApi.googleCallback(code, state)
        const decoded = decodeJwt(tokens.access_token)
        const user: User = {
          id: decoded?.sub ?? '',
          email: decoded?.email ?? '',
          full_name: null,
          role: decoded?.role ?? 'viewer',
          school_id: decoded?.school_id ?? null,
          is_active: true,
          is_email_verified: true,
          avatar_url: null,
        }
        login(tokens, user)
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
      <p className="mt-4 text-sm text-gray-500 font-medium">Completing login...</p>
    </div>
  )
}
