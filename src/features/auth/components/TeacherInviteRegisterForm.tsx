import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { teacherInviteFormSchema, type TeacherInviteFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthPasswordInput, AuthButton } from '@/components/ui/auth-fuse'
import { GoogleIcon } from './GoogleIcon'
import { useOtpCooldown } from '../hooks/useOtpCooldown'

export interface NavProps {
  navigate: (path: string, options?: { state?: unknown }) => void
}

export function TeacherInviteRegisterForm({
  inviteToken,
  navigate,
}: NavProps & { inviteToken: string }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TeacherInviteFormData>({
    resolver: zodResolver(teacherInviteFormSchema),
  })

  const watchEmail = useWatch({ control, name: 'email', defaultValue: '' })
  const { isCoolingDown, timeLeft, startCooldown } = useOtpCooldown(watchEmail)

  const handleGoogleSignIn = async () => {
    try {
      sessionStorage.setItem('google_pending_role', 'teacher')
      sessionStorage.setItem('google_pending_invite_token', inviteToken)
      const { auth_url } = await authApi.googleLogin()
      window.location.href = auth_url
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const onSubmit = async (data: TeacherInviteFormData) => {
    try {
      const { confirm_password: _cp, ...rest } = data
      await authApi.registerTeacher({ ...rest, invite_token: inviteToken })
      toast.success('Teacher account created! Please verify your email.')
      startCooldown()
      navigate('/verify-otp', { state: { email: data.email, purpose: 'verify_email' } })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-4 animate-in fade-in zoom-in-95 duration-300"
      noValidate
    >
      <AuthInput
        label="Full Name"
        type="text"
        autoComplete="name"
        placeholder="Full name"
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <AuthInput
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="Email Address"
        error={errors.email?.message}
        {...register('email')}
      />

      <AuthPasswordInput
        label="Password"
        autoComplete="new-password"
        placeholder="Password"
        error={errors.password?.message}
        hint="Min 8 chars, uppercase, lowercase, digit &amp; special char"
        {...register('password')}
      />

      <AuthPasswordInput
        label="Confirm Password"
        autoComplete="new-password"
        placeholder="Confirm password"
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />

      <div className="flex items-start gap-2 mt-2">
        <input
          type="checkbox"
          id="terms-teacher-invite"
          className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer transition-colors"
        />
        <label
          htmlFor="terms-teacher-invite"
          className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
        >
          I accept the{' '}
          <Link to="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Terms &amp; Conditions
          </Link>
        </label>
      </div>

      <AuthButton type="submit" disabled={isSubmitting || isCoolingDown} className="w-full mt-2">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        {isCoolingDown ? `Wait ${timeLeft}s to register again` : 'Create Teacher Account'}
      </AuthButton>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground font-medium">or</span>
        </div>
      </div>

      <AuthButton
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
      >
        <GoogleIcon />
        Continue with Google
      </AuthButton>
    </form>
  )
}
