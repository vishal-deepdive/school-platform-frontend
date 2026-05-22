import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { email?: string } | null
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: state?.email ?? '' },
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const { confirm_password: _, ...rest } = data
      await authApi.resetPassword(rest)
      toast.success('Password reset! Please sign in with your new password.')
      navigate('/login')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
          <KeyRound className="h-6 w-6 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="OTP Code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          error={errors.otp?.message}
          {...register('otp')}
        />

        <div className="relative">
          <Input
            label="New password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.new_password?.message}
            hint="Min 8 chars with uppercase, lowercase, number & special character"
            className="pr-10"
            {...register('new_password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirm_password?.message}
          {...register('confirm_password')}
        />

        <Button type="submit" loading={isSubmitting} icon={<KeyRound className="h-4 w-4" />}>
          Reset password
        </Button>

        <p className="text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
