import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { verifyOtpSchema, type VerifyOtpFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthButton } from '@/components/ui/auth-fuse'

export interface VerifyOtpFormProps {
  initialEmail?: string
  initialPurpose?: VerifyOtpFormData['purpose']
}

export function VerifyOtpForm({ initialEmail = '', initialPurpose = 'verify_email' }: VerifyOtpFormProps) {
  const navigate = useNavigate()
  const calledOnce = useRef(false)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email: initialEmail,
      purpose: initialPurpose,
    },
  })

  useEffect(() => {
    if (!calledOnce.current && initialEmail) {
      setValue('email', initialEmail)
      calledOnce.current = true
    }
  }, [initialEmail, setValue])

  const onSubmit = async (data: VerifyOtpFormData) => {
    try {
      await authApi.verifyOtp(data)
      toast.success(
        data.purpose === 'verify_email'
          ? 'Email verified! Please sign in.'
          : 'OTP verified! Set your new password.',
      )
      if (data.purpose === 'verify_email') {
        navigate('/login')
      } else {
        navigate('/reset-password', { state: { email: data.email } })
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const [isResending, setIsResending] = useState(false)

  const onResend = async () => {
    const email = getValues('email')
    if (!email) {
      toast.error('Please enter your email to resend OTP.')
      return
    }

    try {
      setIsResending(true)
      await authApi.resendOtp({ email })
      toast.success('A new OTP has been sent to your email.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <AuthInput
          type="email"
          autoComplete="email"
          placeholder="Email Address"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div>
        <AuthInput
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          error={errors.otp?.message}
          hint="Check your email inbox (and spam folder)"
          className="font-mono text-center text-lg tracking-widest"
          {...register('otp')}
        />
      </div>

      <input type="hidden" {...register('purpose')} />

      <div className="pt-2">
        <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          Verify OTP
        </AuthButton>
      </div>

      {initialPurpose === 'verify_email' && (
        <div className="text-center mt-2">
          <button
            type="button"
            onClick={onResend}
            disabled={isResending || isSubmitting}
            className="text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
          >
            {isResending ? 'Resending...' : "Didn't receive a code? Resend"}
          </button>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground mt-2">
        <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
