import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthButton } from '@/components/ui/auth-fuse'

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
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center sm:text-left">
        <div className="mb-6 flex justify-center sm:justify-start">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
            <Mail className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Forgot password?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we'll send you a reset OTP.
        </p>
      </div>

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

        <div className="pt-2">
          <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            Send reset OTP
          </AuthButton>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-2">
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
