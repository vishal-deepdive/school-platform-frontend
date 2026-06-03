import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { googleCompleteParentSchema, type GoogleCompleteParentFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthSubmitButton } from '@/components/ui/auth-fuse'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Select } from '@/components/ui/Select'
import { useSchoolSearch, useStudentSearch } from '@/hooks/useSchoolSearch'
import { RELATION_OPTIONS } from '../constants'
import type { ParentFormProps } from './types'

export function ParentCompleteForm({ googleToken, prefillName, onPending }: ParentFormProps) {
  const {
    register,
    setValue,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<GoogleCompleteParentFormData>({
    resolver: zodResolver(googleCompleteParentSchema),
    defaultValues: { full_name: prefillName || undefined, relation: 'guardian' },
  })

  const selectedSchoolId  = useWatch({ control, name: 'school_id',  defaultValue: '' })
  const selectedStudentId = useWatch({ control, name: 'student_id', defaultValue: '' })

  const { options: schoolOptions, setQuery: setSchoolQuery, isSearching: isSearchingSchools } =
    useSchoolSearch()
  const { options: studentOptions, setQuery: setStudentQuery, isSearching: isSearchingStudents } =
    useStudentSearch(selectedSchoolId)

  const onSubmit = async (data: GoogleCompleteParentFormData) => {
    try {
      const result = await authApi.googleCompleteRegistration({
        google_token: googleToken,
        role:         'parent',
        full_name:    data.full_name || undefined,
        school_id:    data.school_id,
        student_id:   data.student_id,
        relation:     data.relation,
      })
      if ('status' in result && result.status === 'pending_approval') {
        onPending(result.message)
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300"
      noValidate
    >
      <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
        Parent accounts require <strong>school approval</strong> before you can log in.
        Link your child&apos;s Student ID below.
      </p>

      <AuthInput
        type="text"
        autoComplete="name"
        placeholder="Full name"
        error={errors.full_name?.message}
        {...register('full_name')}
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
        label="Relationship to student"
        options={RELATION_OPTIONS}
        error={errors.relation?.message}
        {...register('relation')}
      />

      <AuthSubmitButton icon={CheckCircle} isLoading={isSubmitting} className="mt-2">
        Register as Parent
      </AuthSubmitButton>
    </form>
  )
}
