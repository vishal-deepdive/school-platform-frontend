import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthPasswordInput, AuthSubmitButton } from '@/components/ui/auth-fuse'

export interface ResetPasswordFormProps {
  initialEmail?: string
}

export function ResetPasswordForm({ initialEmail = '' }: ResetPasswordFormProps) {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: initialEmail },
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

  const otpReg = register('otp')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <AuthInput
          type="email"
          autoComplete="email"
          placeholder="Email"
          error={errors.email?.message}
          readOnly={!!initialEmail}
          className={initialEmail ? 'bg-muted/50 text-muted-foreground cursor-default' : ''}
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
          {...otpReg}
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\D/g, '')
            otpReg.onChange(e)
          }}
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
        <AuthSubmitButton icon={KeyRound} isLoading={isSubmitting} className="mt-2">
          Reset password
        </AuthSubmitButton>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-2">
        <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
