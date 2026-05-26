import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { loginSchema, type LoginFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { decodeJwt } from '@/lib/jwt'
import type { User } from '@/types/auth'
import { motion } from 'framer-motion'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

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
        avatar_url: null,
      }
      login(tokens, user)
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (err) {
      const msg = getErrorMessage(err)
      if (msg.includes('verify') || msg.includes('otp')) {
        navigate('/verify-otp', { state: { email: data.email, purpose: 'verify_email' } })
      } else {
        toast.error(msg)
      }
    }
  }

  // Stagger animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Sign in</h1>
        <p className="mt-2 text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
            Create one
          </Link>
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <motion.div variants={itemVariants}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            error={errors.email?.message}
            {...register('email')}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Link
            to="/forgot-password"
            className="self-end text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Forgot password?
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className="pt-2">
          <Button type="submit" loading={isSubmitting} icon={<LogIn className="h-4 w-4" />} className="w-full">
            Sign in
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="relative mt-2 mb-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-500 font-medium">or continue with</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                const { auth_url } = await authApi.googleLogin()
                window.location.href = auth_url
              } catch (err) {
                toast.error(getErrorMessage(err))
              }
            }}
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>
        </motion.div>
      </form>
    </motion.div>
  )
}
