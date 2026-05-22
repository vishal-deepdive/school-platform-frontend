import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, UserPlus, GraduationCap, School, Users } from 'lucide-react'
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
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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

  // Keep tab state synchronized with query params if they change
  useEffect(() => {
    if (tokenParam) {
      setActiveTab('teacher')
    } else if (roleParam === 'teacher' || roleParam === 'parent') {
      setActiveTab(roleParam)
    }
  }, [tokenParam, roleParam])

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Create account</h1>
        <p className="mt-2 text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      {/* Tabs Header */}
      <div className="mb-6 flex gap-1 p-1 bg-gray-100 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50 border border-transparent'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Form Area */}
      <div className="bg-white p-2 rounded-2xl">
        {activeTab === 'student' && (
          <StudentRegisterForm defaultSchoolId={schoolParam || ''} navigate={navigate} />
        )}
        {activeTab === 'teacher' && (
          <TeacherRegisterForm defaultToken={tokenParam || ''} navigate={navigate} />
        )}
        {activeTab === 'parent' && (
          <ParentRegisterForm defaultSchoolId={schoolParam || ''} navigate={navigate} />
        )}
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
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentRegisterFormData>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: { school_id: defaultSchoolId },
  })

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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4.5" noValidate>
      <Input
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="Aarav Sharma"
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="aarav.sharma@student.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="School ID"
        type="text"
        placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6"
        error={errors.school_id?.message}
        hint="UUID of the school to join"
        {...register('school_id')}
      />

      <Input
        label="Class Code"
        type="text"
        placeholder="MATH7A-X3K"
        error={errors.class_code?.message}
        hint="Provided by your class teacher (e.g. MATH7A-X3K)"
        {...register('class_code')}
      />

      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
          className="pr-10"
          hint="Min 8 characters, with uppercase, lowercase, digit & special character"
          {...register('password')}
        />
        <button
          type="button"
          onClick={() => setShowPassword((p) => !p)}
          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />

      <Button type="submit" loading={isSubmitting} icon={<UserPlus className="h-4 w-4" />}>
        Create Student Account
      </Button>
    </form>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   TEACHER REGISTRATION FORM
   ──────────────────────────────────────────────────────────────────────────── */
function TeacherRegisterForm({ defaultToken, navigate }: FormProps & { defaultToken: string }) {
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeacherRegisterFormData>({
    resolver: zodResolver(teacherRegisterSchema),
    defaultValues: { invite_token: defaultToken },
  })

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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4.5" noValidate>
      <Input
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="Dr. Priya Patel"
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="priya.patel@school.edu"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Invite Token"
        type="text"
        placeholder="64-character hex invite token"
        error={errors.invite_token?.message}
        hint="Must be the 64-character hex string from your invite link"
        {...register('invite_token')}
      />

      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
          className="pr-10"
          hint="Min 8 characters, with uppercase, lowercase, digit & special character"
          {...register('password')}
        />
        <button
          type="button"
          onClick={() => setShowPassword((p) => !p)}
          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />

      <Button type="submit" loading={isSubmitting} icon={<UserPlus className="h-4 w-4" />}>
        Create Teacher Account
      </Button>
    </form>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   PARENT REGISTRATION FORM
   ──────────────────────────────────────────────────────────────────────────── */
function ParentRegisterForm({ defaultSchoolId, navigate }: FormProps & { defaultSchoolId: string }) {
  const [showPassword, setShowPassword] = useState(false)
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4.5" noValidate>
      <Input
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="Rajesh Sharma"
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="rajesh.sharma@parent.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="School ID"
        type="text"
        placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6"
        error={errors.school_id?.message}
        hint="UUID of the school where the student is enrolled"
        {...register('school_id')}
      />

      <Input
        label="Student ID"
        type="text"
        placeholder="7cb89f12-3456-7890-abcd-ef1234567890"
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

      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
          className="pr-10"
          hint="Min 8 characters, with uppercase, lowercase, digit & special character"
          {...register('password')}
        />
        <button
          type="button"
          onClick={() => setShowPassword((p) => !p)}
          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />

      <Button type="submit" loading={isSubmitting} icon={<UserPlus className="h-4 w-4" />}>
        Register Parent Account
      </Button>
    </form>
  )
}
