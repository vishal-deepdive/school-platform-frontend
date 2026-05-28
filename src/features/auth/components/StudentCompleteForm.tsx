import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { googleCompleteStudentSchema, type GoogleCompleteStudentFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthButton } from '@/components/ui/auth-fuse'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect'
import { useDebounce } from '@/hooks/useDebounce'
import type { TokenResponse, SchoolSearchItem, ClassCodeItem } from '@/types/auth'
import type { CompleteFormProps } from './types'

export function StudentCompleteForm({ googleToken, prefillName, onSuccess }: CompleteFormProps) {
  const hintSchoolId = sessionStorage.getItem('google_pending_school_id') ?? ''

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoogleCompleteStudentFormData>({
    resolver: zodResolver(googleCompleteStudentSchema),
    defaultValues: {
      full_name: prefillName || undefined,
      school_id: hintSchoolId || undefined,
    },
  })

  const selectedSchoolId = register('school_id') ? watch('school_id') : hintSchoolId
  const selectedClassCode = watch('class_code')

  const [schoolQuery, setSchoolQuery] = useState('')
  const debouncedSchoolQuery = useDebounce(schoolQuery, 500)
  const [schools, setSchools] = useState<SchoolSearchItem[]>([])
  const [isSearchingSchools, setIsSearchingSchools] = useState(false)

  const [classes, setClasses] = useState<ClassCodeItem[]>([])
  const [isLoadingClasses, setIsLoadingClasses] = useState(false)

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
    if (!selectedSchoolId) {
      setClasses([])
      return
    }
    const fetchClasses = async () => {
      setIsLoadingClasses(true)
      try {
        const results = await authApi.getSchoolClasses(selectedSchoolId)
        setClasses(results)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoadingClasses(false)
      }
    }
    fetchClasses()
  }, [selectedSchoolId])

  const schoolOptions: SearchableSelectOption[] = schools.map(s => ({
    label: s.name,
    value: s.id,
    sublabel: [s.address, s.city, s.state, s.pin_code].filter(Boolean).join(', ')
  }))

  const classOptions: SearchableSelectOption[] = classes.map(c => ({
    label: c.class_name,
    value: c.code,
    sublabel: c.section ? `Section ${c.section}` : undefined
  }))

  const onSubmit = async (data: GoogleCompleteStudentFormData) => {
    try {
      const result = await authApi.googleCompleteRegistration({
        google_token: googleToken,
        role:         'student',
        full_name:    data.full_name || undefined,
        school_id:    data.school_id,
        class_code:   data.class_code,
        roll_number:  data.roll_number,
      })
      if ('access_token' in result) {
        onSuccess(result as TokenResponse)
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
      <p className="text-xs text-muted-foreground bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
        Students need a <strong>School ID</strong> and a <strong>Class Code</strong> provided by
        their teacher.
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
          setValue('class_code', '', { shouldValidate: true })
        }}
        onSearchChange={setSchoolQuery}
        isLoading={isSearchingSchools}
        error={errors.school_id?.message}
        hint="Search by name, city, or address"
      />

      <SearchableSelect
        label="Class"
        placeholder={selectedSchoolId ? "Select your class..." : "Select a school first..."}
        searchPlaceholder="Search classes..."
        options={classOptions}
        value={selectedClassCode}
        onChange={(val) => setValue('class_code', val, { shouldValidate: true })}
        isLoading={isLoadingClasses}
        error={errors.class_code?.message}
        hint="Provided by your class teacher"
      />

      <AuthInput
        label="Roll Number"
        type="text"
        placeholder="Enter your roll number"
        error={errors.roll_number?.message}
        {...register('roll_number')}
      />

      <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <CheckCircle className="h-4 w-4 mr-2" />
        )}
        Join as Student
      </AuthButton>
    </form>
  )
}
