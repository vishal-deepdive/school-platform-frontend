import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { verifyOtpSchema, type VerifyOtpFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function VerifyOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { email?: string; purpose?: VerifyOtpFormData['purpose'] } | null
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
      email: state?.email ?? '',
      purpose: state?.purpose ?? 'verify_email',
    },
  })

  useEffect(() => {
    if (!calledOnce.current && state?.email) {
      setValue('email', state.email)
      calledOnce.current = true
    }
  }, [state?.email, setValue])

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

  const purpose = state?.purpose ?? 'verify_email'

  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
          <ShieldCheck className="h-6 w-6 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Verify OTP</h1>
        <p className="mt-1 text-sm text-gray-500">
          {purpose === 'verify_email'
            ? 'Enter the 6-digit code sent to your email to verify your account.'
            : 'Enter the 6-digit code sent to your email to reset your password.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@school.edu"
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
          hint="Check your email inbox (and spam folder)"
          {...register('otp')}
        />

        <input type="hidden" {...register('purpose')} />

        <Button type="submit" loading={isSubmitting} icon={<ShieldCheck className="h-4 w-4" />}>
          Verify OTP
        </Button>

        {purpose === 'verify_email' && (
          <div className="text-center">
            <button
              type="button"
              onClick={onResend}
              disabled={isResending || isSubmitting}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
            >
              {isResending ? 'Resending...' : "Didn't receive a code? Resend"}
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
