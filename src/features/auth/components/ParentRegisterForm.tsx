import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { parentRegisterSchema, type ParentRegisterFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthPasswordInput, AuthButton } from '@/components/ui/auth-fuse'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect'
import { useDebounce } from '@/hooks/useDebounce'
import type { SchoolSearchItem, StudentSearchItem } from '@/types/auth'
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
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ParentRegisterFormData>({
    resolver: zodResolver(parentRegisterSchema),
    defaultValues: { school_id: defaultSchoolId, relation: 'guardian' },
  })

  const selectedSchoolId = watch('school_id')
  const selectedStudentId = watch('student_id')

  const [schoolQuery, setSchoolQuery] = useState('')
  const debouncedSchoolQuery = useDebounce(schoolQuery, 500)
  const [schools, setSchools] = useState<SchoolSearchItem[]>([])
  const [isSearchingSchools, setIsSearchingSchools] = useState(false)

  const [studentQuery, setStudentQuery] = useState('')
  const debouncedStudentQuery = useDebounce(studentQuery, 500)
  const [students, setStudents] = useState<StudentSearchItem[]>([])
  const [isSearchingStudents, setIsSearchingStudents] = useState(false)

  useEffect(() => {
    if (debouncedSchoolQuery.length === 1) {
      setSchools([])
      return
    }
    const fetchSchools = async () => {
      setIsSearchingSchools(true)
      try {
        const results = await authApi.searchSchools(debouncedSchoolQuery)
        setSchools(results)
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearchingSchools(false)
      }
    }
    fetchSchools()
  }, [debouncedSchoolQuery])

  useEffect(() => {
    if (!selectedSchoolId || debouncedStudentQuery.length === 0) {
      setStudents([])
      return
    }
    const fetchStudents = async () => {
      setIsSearchingStudents(true)
      try {
        const results = await authApi.searchStudentsByRoll(selectedSchoolId, debouncedStudentQuery)
        setStudents(results)
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearchingStudents(false)
      }
    }
    fetchStudents()
  }, [debouncedStudentQuery, selectedSchoolId])

  const schoolOptions: SearchableSelectOption[] = schools.map(s => ({
    label: s.name,
    value: s.id,
    sublabel: [s.address, s.city, s.state, s.pin_code].filter(Boolean).join(', ')
  }))

  const studentOptions: SearchableSelectOption[] = students.map(s => ({
    label: s.full_name || 'Unnamed Student',
    value: s.id,
    sublabel: `Roll No: ${s.roll_number}`
  }))

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
        placeholder={selectedSchoolId ? "Search for student by roll number..." : "Select a school first..."}
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
