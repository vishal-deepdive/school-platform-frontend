import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { studentRegisterSchema, type StudentRegisterFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthPasswordInput, AuthButton } from '@/components/ui/auth-fuse'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect'
import { useDebounce } from '@/hooks/useDebounce'
import type { SchoolSearchItem, ClassCodeItem } from '@/types/auth'
import { GoogleIcon } from './GoogleIcon'
import type { NavProps } from './TeacherInviteRegisterForm'
import { useOtpCooldown } from '../hooks/useOtpCooldown'

export function StudentRegisterForm({
  defaultSchoolId,
  navigate,
}: NavProps & { defaultSchoolId: string }) {
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StudentRegisterFormData>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: { school_id: defaultSchoolId },
  })

  const watchEmail = useWatch({ control, name: 'email', defaultValue: '' })
  const { isCoolingDown, timeLeft, startCooldown } = useOtpCooldown(watchEmail)

  const selectedSchoolId = watch('school_id')
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

      <AuthButton type="submit" disabled={isSubmitting || isCoolingDown} className="w-full mt-2">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        {isCoolingDown ? `Wait ${timeLeft}s to register again` : 'Create Student Account'}
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
