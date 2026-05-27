import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { parentRegisterSchema, type ParentRegisterFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthPasswordInput, AuthButton } from '@/components/ui/auth-fuse'
import { Select } from '@/components/ui/Select'
import type { NavProps } from './TeacherInviteRegisterForm'

const relationOptions = [
  { value: 'father',   label: 'Father' },
  { value: 'mother',   label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other',    label: 'Other' },
]

export function ParentRegisterForm({
  defaultSchoolId,
  navigate,
}: NavProps & { defaultSchoolId: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ParentRegisterFormData>({
    resolver: zodResolver(parentRegisterSchema),
    defaultValues: { school_id: defaultSchoolId, relation: 'guardian' },
  })

  const onSubmit = async (data: ParentRegisterFormData) => {
    try {
      const { confirm_password: _, ...payload } = data
      await authApi.registerParent(payload)
      toast.success('Parent account registered! Please verify your email address. Approval is pending.')
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
        hint="UUID of the school where the student is enrolled"
        {...register('school_id')}
      />

      <AuthInput
        label="Student ID"
        type="text"
        placeholder="Student ID (UUID)"
        error={errors.student_id?.message}
        hint="UUID of the student to link to this account"
        {...register('student_id')}
      />

      <Select
        label="Relationship to Student"
        options={relationOptions}
        error={errors.relation?.message}
        {...register('relation')}
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
          id="terms-parent"
          className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer transition-colors"
        />
        <label
          htmlFor="terms-parent"
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
        Register Parent Account
      </AuthButton>
    </form>
  )
}
