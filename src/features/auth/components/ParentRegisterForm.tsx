import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { parentRegisterSchema, type ParentRegisterFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthPasswordInput, AuthSubmitButton } from '@/components/ui/auth-fuse'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Select } from '@/components/ui/Select'
import { TermsCheckbox } from '@/components/common/TermsCheckbox'
import { useSchoolSearch, useStudentSearch } from '@/hooks/useSchoolSearch'
import { useOtpCooldown } from '../hooks/useOtpCooldown'
import { RELATION_OPTIONS } from '../constants'
import type { NavProps } from './types'

export function ParentRegisterForm({
  defaultSchoolId,
  navigate,
}: NavProps & { defaultSchoolId: string }) {
  const {
    register,
    setValue,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ParentRegisterFormData>({
    resolver: zodResolver(parentRegisterSchema),
    defaultValues: { school_id: defaultSchoolId, relation: 'guardian', terms: false },
  })

  // useWatch instead of watch — only re-renders on changes to these specific fields
  const watchEmail       = useWatch({ control, name: 'email',      defaultValue: '' })
  const selectedSchoolId = useWatch({ control, name: 'school_id',  defaultValue: defaultSchoolId })
  const selectedStudentId = useWatch({ control, name: 'student_id', defaultValue: '' })

  const { startCooldown } = useOtpCooldown(watchEmail, 'verify_email', false)

  const { options: schoolOptions, setQuery: setSchoolQuery, isSearching: isSearchingSchools } =
    useSchoolSearch()
  const { options: studentOptions, setQuery: setStudentQuery, isSearching: isSearchingStudents } =
    useStudentSearch(selectedSchoolId)

  const onSubmit = async (data: ParentRegisterFormData) => {
    try {
      const { confirm_password: _, terms: __, ...payload } = data
      await authApi.registerParent(payload)
      toast.success('Parent account registered! Please verify your email address. Approval is pending.')
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

      <SearchableSelect
        label="School"
        placeholder="Search for your school..."
        searchPlaceholder="Type school name or address..."
        options={schoolOptions}
        value={selectedSchoolId}
        onChange={(val) => {
          setValue('school_id', val, { shouldValidate: true })
          setValue('student_id', '', { shouldValidate: true })
        }}
        onSearchChange={setSchoolQuery}
        isLoading={isSearchingSchools}
        error={errors.school_id?.message}
        hint="Search by name, city, or address"
      />

      <SearchableSelect
        label="Student"
        placeholder={selectedSchoolId ? 'Search for student by roll number...' : 'Select a school first...'}
        searchPlaceholder="Type roll number..."
        options={studentOptions}
        value={selectedStudentId}
        onChange={(val) => setValue('student_id', val, { shouldValidate: true })}
        onSearchChange={setStudentQuery}
        isLoading={isSearchingStudents}
        error={errors.student_id?.message}
        hint="Search by your child's roll number"
      />

      <Select
        label="Relationship to Student"
        options={RELATION_OPTIONS}
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

      <TermsCheckbox error={errors.terms?.message} {...register('terms')} />

      <AuthSubmitButton icon={UserPlus} isLoading={isSubmitting} className="mt-2">
        Register Parent Account
      </AuthSubmitButton>
    </form>
  )
}
