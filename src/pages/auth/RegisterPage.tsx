import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, GraduationCap, School, Users, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  studentRegisterSchema,
  teacherRegisterSchema,
  parentRegisterSchema,
  type StudentRegisterFormData,
  type TeacherRegisterFormData,
  type ParentRegisterFormData,
} from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthPasswordInput, AuthButton } from '@/components/ui/auth-fuse'
import { Select } from '@/components/ui/Select'

const tabs = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'teacher', label: 'Teacher', icon: School },
  { id: 'parent', label: 'Parent', icon: Users },
] as const

type TabType = typeof tabs[number]['id']

const relationOptions = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
]

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenParam = searchParams.get('token')
  const schoolParam = searchParams.get('school') || searchParams.get('school_id')
  const roleParam = searchParams.get('role')

  const initialTab: TabType = tokenParam
    ? 'teacher'
    : roleParam === 'teacher' || roleParam === 'parent'
    ? roleParam
    : 'student'

  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  useEffect(() => {
    if (tokenParam) {
      setActiveTab('teacher')
    } else if (roleParam === 'teacher' || roleParam === 'parent') {
      setActiveTab(roleParam as TabType)
    }
  }, [tokenParam, roleParam])

  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-2 text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
        <p className="text-balance text-sm text-muted-foreground">Enter your details below to sign up</p>
      </div>

      {/* Tabs Header */}
      <div className="mb-6 flex gap-1 p-1.5 bg-muted rounded-3xl border border-border/50">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all duration-300 relative ${
                isActive
                  ? 'text-primary bg-background shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <div className="relative flex items-center gap-2 z-10">
                <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{tab.label}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Form Area */}
      <div className="relative px-1">
        {activeTab === 'student' && <StudentRegisterForm defaultSchoolId={schoolParam || ''} navigate={navigate} />}
        {activeTab === 'teacher' && <TeacherRegisterForm defaultToken={tokenParam || ''} navigate={navigate} />}
        {activeTab === 'parent' && <ParentRegisterForm defaultSchoolId={schoolParam || ''} navigate={navigate} />}
      </div>

      <div className="text-center text-sm mt-4">
        Already have an account?{' '}
        <Link to="/login" className="pl-1 font-semibold text-primary hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   STUDENT REGISTRATION FORM
   ──────────────────────────────────────────────────────────────────────────── */
interface FormProps {
  navigate: (path: string, options?: { state?: any }) => void
}

function StudentRegisterForm({ defaultSchoolId, navigate }: FormProps & { defaultSchoolId: string }) {
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
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 animate-in fade-in zoom-in-95 duration-300" noValidate>
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
        hint="Min 8 chars, uppercase, lowercase, digit & special char"
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
        <label htmlFor="terms-student" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
          I accept the{' '}
          <Link to="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Terms & Conditions
          </Link>
        </label>
      </div>

      <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
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
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </AuthButton>
    </form>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   TEACHER REGISTRATION FORM
   ──────────────────────────────────────────────────────────────────────────── */
function TeacherRegisterForm({ defaultToken, navigate }: FormProps & { defaultToken: string }) {
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeacherRegisterFormData>({
    resolver: zodResolver(teacherRegisterSchema),
    defaultValues: { invite_token: defaultToken },
  })

  const handleGoogleSignIn = async () => {
    try {
      const currentInviteToken = watch('invite_token') ?? ''
      sessionStorage.setItem('google_pending_role', 'teacher')
      if (currentInviteToken) {
        sessionStorage.setItem('google_pending_invite_token', currentInviteToken)
      }
      const { auth_url } = await authApi.googleLogin()
      window.location.href = auth_url
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const onSubmit = async (data: TeacherRegisterFormData) => {
    try {
      const { confirm_password: _, ...payload } = data
      await authApi.registerTeacher(payload)
      toast.success('Teacher account created! Please verify your email.')
      navigate('/verify-otp', { state: { email: data.email, purpose: 'verify_email' } })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 animate-in fade-in zoom-in-95 duration-300" noValidate>
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
        label="Invite Token"
        type="text"
        placeholder="Invite Token"
        error={errors.invite_token?.message}
        hint="Must be the 64-character hex string from your invite link"
        {...register('invite_token')}
      />

      <AuthPasswordInput
        label="Password"
        autoComplete="new-password"
        placeholder="Password"
        error={errors.password?.message}
        hint="Min 8 chars, uppercase, lowercase, digit & special char"
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
          id="terms-teacher" 
          className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer transition-colors"
        />
        <label htmlFor="terms-teacher" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
          I accept the{' '}
          <Link to="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Terms & Conditions
          </Link>
        </label>
      </div>

      <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
        Create Teacher Account
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
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </AuthButton>
    </form>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   PARENT REGISTRATION FORM
   ──────────────────────────────────────────────────────────────────────────── */
function ParentRegisterForm({ defaultSchoolId, navigate }: FormProps & { defaultSchoolId: string }) {
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
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 animate-in fade-in zoom-in-95 duration-300" noValidate>
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
        hint="Min 8 chars, uppercase, lowercase, digit & special char"
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
        <label htmlFor="terms-parent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
          I accept the{' '}
          <Link to="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Terms & Conditions
          </Link>
        </label>
      </div>

      <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
        Register Parent Account
      </AuthButton>
    </form>
  )
}
