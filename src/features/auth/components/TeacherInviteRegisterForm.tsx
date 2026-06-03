import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { teacherInviteFormSchema, type TeacherInviteFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthPasswordInput, AuthButton, AuthSubmitButton } from '@/components/ui/auth-fuse'
import { TermsCheckbox } from '@/components/common/TermsCheckbox'
import { OrDivider } from '@/components/common/OrDivider'
import { GoogleIcon } from './GoogleIcon'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import { useOtpCooldown } from '../hooks/useOtpCooldown'
import type { NavProps } from './types'

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
    defaultValues: { terms: false },
  })

  const watchEmail = useWatch({ control, name: 'email', defaultValue: '' })
  const { startCooldown } = useOtpCooldown(watchEmail, 'verify_email', false)
  const { handleGoogleLogin } = useGoogleAuth()

  const onSubmit = async (data: TeacherInviteFormData) => {
    try {
      const { confirm_password: _, terms: __, ...rest } = data
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

      <TermsCheckbox error={errors.terms?.message} {...register('terms')} />

      <AuthSubmitButton icon={UserPlus} isLoading={isSubmitting} className="mt-2">
        Create Teacher Account
      </AuthSubmitButton>

      <OrDivider />

      <AuthButton
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => handleGoogleLogin({ role: 'teacher', inviteToken })}
      >
        <GoogleIcon />
        Continue with Google
      </AuthButton>
    </form>
  )
}
