import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { googleCompleteParentSchema, type GoogleCompleteParentFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthButton } from '@/components/ui/auth-fuse'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect'
import { useDebounce } from '@/hooks/useDebounce'
import type { SchoolSearchItem, StudentSearchItem } from '@/types/auth'
import { Select } from '@/components/ui/Select'
import type { ParentFormProps } from './types'

const relationOptions = [
  { value: 'father',   label: 'Father' },
  { value: 'mother',   label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other',    label: 'Other' },
]

export function ParentCompleteForm({ googleToken, prefillName, onPending }: ParentFormProps) {
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoogleCompleteParentFormData>({
    resolver: zodResolver(googleCompleteParentSchema),
    defaultValues: { full_name: prefillName || undefined, relation: 'guardian' },
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
      // Backend returns 202 { status: 'pending_approval', message: '...' }
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
        Link your child's Student ID below.
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
        label="Relationship to student"
        options={relationOptions}
        error={errors.relation?.message}
        {...register('relation')}
      />

      <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <CheckCircle className="h-4 w-4 mr-2" />
        )}
        Register as Parent
      </AuthButton>
    </form>
  )
}
