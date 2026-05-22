import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function ForgotPasswordPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await authApi.forgotPassword(data)
      toast.success('OTP sent to your email!')
      navigate('/verify-otp', { state: { email: data.email, purpose: 'reset_password' } })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
          <Mail className="h-6 w-6 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email and we'll send you a reset OTP.
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

        <Button type="submit" loading={isSubmitting} icon={<Mail className="h-4 w-4" />}>
          Send reset OTP
        </Button>

        <p className="text-center text-sm text-gray-500">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
