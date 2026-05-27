import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { loginSchema, type LoginFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { getErrorMessage } from '@/lib/utils'
import { decodeJwt } from '@/lib/jwt'
import type { User } from '@/types/auth'
import { AuthInput, AuthPasswordInput, AuthButton } from '@/components/ui/auth-fuse'
import { GoogleIcon } from './GoogleIcon'

export function LoginForm({ redirectPath = '/' }: { redirectPath?: string }) {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    try {
      const tokens = await authApi.login(data)
      const decoded = decodeJwt(tokens.access_token)
      const user: User = {
        id: decoded?.sub ?? '',
        email: decoded?.email ?? data.email,
        full_name: null,
        role: decoded?.role ?? 'viewer',
        school_id: decoded?.school_id ?? null,
        is_active: true,
        is_email_verified: true,
        avatar_url: decoded?.avatar_url ?? null,
      }
      login(tokens, user)
      toast.success('Welcome back!')
      navigate(redirectPath, { replace: true })
    } catch (err) {
      const msg = getErrorMessage(err)
      if (msg.includes('verify') || msg.includes('otp')) {
        navigate('/verify-otp', { state: { email: data.email, purpose: 'verify_email' } })
      } else {
        toast.error(msg)
      }
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { auth_url } = await authApi.googleLogin()
      window.location.href = auth_url
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8" noValidate>
        <div className="grid gap-4">
          <AuthInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="flex flex-col gap-1.5">
            <AuthPasswordInput
              label="Password"
              autoComplete="current-password"
              placeholder="Password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Link
              to="/forgot-password"
              className="self-end text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <AuthButton type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
            Sign in
          </AuthButton>
        </div>
      </form>

      <div className="text-center text-sm mt-8">
        Don't have an account?{' '}
        <Link to="/register" className="pl-1 font-semibold text-primary hover:text-primary/80 transition-colors">
          Sign up
        </Link>
      </div>

      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border mt-2 mb-2">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">Or continue with</span>
      </div>

      <AuthButton
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
      >
        <GoogleIcon />
        Continue with Google
      </AuthButton>
    </>
  )
}
