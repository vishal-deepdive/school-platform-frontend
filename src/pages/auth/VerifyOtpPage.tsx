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
import { motion } from 'framer-motion'

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
        <div className="mb-6 flex justify-center sm:justify-start">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100/50 shadow-inner"
          >
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
          </motion.div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Verify OTP</h1>
        <p className="mt-2 text-sm text-gray-500">
          {purpose === 'verify_email'
            ? 'Enter the 6-digit code sent to your email to verify your account.'
            : 'Enter the 6-digit code sent to your email to reset your password.'}
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

        <motion.div variants={itemVariants}>
          <Input
            label="OTP Code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            error={errors.otp?.message}
            hint="Check your email inbox (and spam folder)"
            className="font-mono text-center text-lg tracking-widest"
            {...register('otp')}
          />
        </motion.div>

        <input type="hidden" {...register('purpose')} />

        <motion.div variants={itemVariants} className="pt-2">
          <Button type="submit" loading={isSubmitting} icon={<ShieldCheck className="h-4 w-4" />} className="w-full mt-2">
            Verify OTP
          </Button>
        </motion.div>

        {purpose === 'verify_email' && (
          <motion.div variants={itemVariants} className="text-center mt-2">
            <button
              type="button"
              onClick={onResend}
              disabled={isResending || isSubmitting}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isResending ? 'Resending...' : "Didn't receive a code? Resend"}
            </button>
          </motion.div>
        )}

        <motion.p variants={itemVariants} className="text-center text-sm text-gray-500 mt-2">
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
            Back to sign in
          </Link>
        </motion.p>
      </form>
    </motion.div>
  )
}
