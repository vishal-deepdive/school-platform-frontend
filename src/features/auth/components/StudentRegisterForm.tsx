import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { studentRegisterSchema, type StudentRegisterFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthPasswordInput, AuthButton } from '@/components/ui/auth-fuse'
import { GoogleIcon } from './GoogleIcon'
import type { NavProps } from './TeacherInviteRegisterForm'

export function StudentRegisterForm({
  defaultSchoolId,
  navigate,
}: NavProps & { defaultSchoolId: string }) {
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentRegisterFormData>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: { school_id: defaultSchoolId },
  })

  const handleGoogleSignIn = async () => {
    try {
      const currentSchoolId = watch('school_id') ?? ''
      sessionStorage.setItem('google_pending_role', 'student')
      if (currentSchoolId) {
        sessionStorage.setItem('google_pending_school_id', currentSchoolId)
      }
      const { auth_url } = await authApi.googleLogin()
      window.location.href = auth_url
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const onSubmit = async (data: StudentRegisterFormData) => {
    try {
      const { confirm_password: _, ...payload } = data
      await authApi.registerStudent(payload)
      toast.success('Student account created! Please verify your email.')
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

      <AuthInput
        label="School ID"
        type="text"
        placeholder="School ID (UUID)"
        error={errors.school_id?.message}
        hint="UUID of the school to join"
        {...register('school_id')}
      />

      <AuthInput
        label="Class Code"
        type="text"
        placeholder="Class Code"
        error={errors.class_code?.message}
        hint="Provided by your class teacher (e.g. MATH7A-X3K)"
        {...register('class_code')}
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
          id="terms-student"
          className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer transition-colors"
        />
        <label
          htmlFor="terms-student"
          className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
        >
          I accept the{' '}
          <Link to="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Terms &amp; Conditions
          </Link>
        </label>
      </div>

      <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        Create Student Account
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
