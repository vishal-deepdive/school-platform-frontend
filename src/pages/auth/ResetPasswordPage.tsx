import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthPasswordInput, AuthButton } from '@/components/ui/auth-fuse'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { email?: string } | null

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
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center sm:text-left">
        <div className="mb-6 flex justify-center sm:justify-start">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Set new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div>
          <AuthInput
            type="email"
            autoComplete="email"
            placeholder="Email"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div>
          <AuthInput
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="OTP Code"
            error={errors.otp?.message}
            className="font-mono text-center text-lg tracking-widest"
            {...register('otp')}
          />
        </div>

        <div>
          <AuthPasswordInput
            autoComplete="new-password"
            placeholder="New password"
            error={errors.new_password?.message}
            hint="Min 8 chars with uppercase, lowercase, number & special character"
            {...register('new_password')}
          />
        </div>

        <div>
          <AuthPasswordInput
            autoComplete="new-password"
            placeholder="Confirm new password"
            error={errors.confirm_password?.message}
            {...register('confirm_password')}
          />
        </div>

        <div className="pt-2">
          <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Reset password
          </AuthButton>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-2">
          <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
