import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { verifyOtpSchema, type VerifyOtpFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { decodeJwt, buildUserFromJwt } from '@/lib/jwt'
import { AuthInput, AuthSubmitButton } from '@/components/ui/auth-fuse'
import { useOtpCooldown } from '../hooks/useOtpCooldown'

export interface VerifyOtpFormProps {
  initialEmail?: string
  initialPurpose?: VerifyOtpFormData['purpose']
}

export function VerifyOtpForm({ initialEmail = '', initialPurpose = 'verify_email' }: VerifyOtpFormProps) {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [isResending, setIsResending] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email: initialEmail, purpose: initialPurpose },
  })

  const watchEmail = useWatch({ control, name: 'email', defaultValue: initialEmail })
  const { isCoolingDown, timeLeft, startCooldown } = useOtpCooldown(watchEmail, initialPurpose)

  const onSubmit = async (data: VerifyOtpFormData) => {
    try {
      const result = await authApi.verifyOtp(data)

      if ('access_token' in result) {
        login(result, buildUserFromJwt(decodeJwt(result.access_token), data.email))
        toast.success('Email verified! Welcome 🎉')
        navigate('/dashboard', { replace: true })
      } else if ('status' in result && result.status === 'pending_approval') {
        toast.success(result.message || 'Email verified! Your account is pending approval.')
        navigate('/login', { replace: true })
      } else {
        toast.success(
          data.purpose === 'verify_email'
            ? 'Email verified! Please sign in.'
            : 'OTP verified! Set your new password.',
        )
        navigate(
          data.purpose === 'verify_email' ? '/login' : '/reset-password',
          data.purpose === 'reset_password' ? { state: { email: data.email } } : undefined,
        )
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const onResend = async () => {
    const email = getValues('email')
    const purpose = getValues('purpose')
    if (!email) {
      toast.error('Please enter your email to resend OTP.')
      return
    }
    try {
      setIsResending(true)
      // Use forgotPassword for reset_password flow, resendOtp for email verification
      if (purpose === 'reset_password') {
        await authApi.forgotPassword({ email })
      } else {
        await authApi.resendOtp({ email })
      }
      toast.success('A new OTP has been sent to your email.')
      startCooldown()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsResending(false)
    }
  }

  const otpReg = register('otp')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <AuthInput
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="Email Address"
        error={errors.email?.message}
        {...register('email')}
      />

      <AuthInput
        label="OTP Code"
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="123456"
        error={errors.otp?.message}
        hint="Check your email inbox (and spam folder)"
        className="font-mono text-center text-lg tracking-widest"
        {...otpReg}
        onChange={(e) => {
          e.target.value = e.target.value.replace(/\D/g, '')
          otpReg.onChange(e)
        }}
      />

      <input type="hidden" {...register('purpose')} />

      <div className="pt-2">
        <AuthSubmitButton icon={ShieldCheck} isLoading={isSubmitting} className="mt-2">
          Verify OTP
        </AuthSubmitButton>
      </div>

      <div className="text-center mt-2">
        <button
          type="button"
          onClick={onResend}
          disabled={isResending || isSubmitting || isCoolingDown}
          className="text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
        >
          {isResending
            ? 'Resending...'
            : isCoolingDown
              ? `Resend in ${timeLeft}s`
              : "Didn't receive a code? Resend"}
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-2">
        <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
