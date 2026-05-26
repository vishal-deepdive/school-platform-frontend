/**
 * GoogleCompleteProfilePage
 *
 * Phase 2 of the Google OAuth sign-up flow.
 * Shown only to new Google users who don't have an account yet.
 *
 * Session data is read from sessionStorage (never the URL) under the key
 * "google_signup_session": { google_token, email, full_name, avatar_url }.
 *
 * Optional hints for pre-filling (set by RegisterPage before Google redirect):
 *   - google_pending_role         → pre-select a tab
 *   - google_pending_invite_token → pre-fill teacher invite_token
 *   - google_pending_school_id    → pre-fill student school_id
 *
 * Role-specific information collected here mirrors the email/password paths:
 *   - Student  → school_id + class_code
 *   - Teacher  → invite_token (from a principal invite link)
 *   - Parent   → school_id + student_id + relation
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GraduationCap, School, Users, CheckCircle, Loader2, Clock, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

import {
  googleCompleteStudentSchema,
  googleCompleteTeacherSchema,
  googleCompleteParentSchema,
  type GoogleCompleteStudentFormData,
  type GoogleCompleteTeacherFormData,
  type GoogleCompleteParentFormData,
} from '@/lib/validators'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { decodeJwt } from '@/lib/jwt'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthButton } from '@/components/ui/auth-fuse'
import { Select } from '@/components/ui/Select'
import type { TokenResponse, User } from '@/types/auth'

// ── Session storage helpers ───────────────────────────────────────────────────

interface GoogleSignupSession {
  google_token: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

function readSignupSession(): GoogleSignupSession | null {
  try {
    const raw = sessionStorage.getItem('google_signup_session')
    if (!raw) return null
    return JSON.parse(raw) as GoogleSignupSession
  } catch {
    return null
  }
}

function clearSignupSession() {
  sessionStorage.removeItem('google_signup_session')
  sessionStorage.removeItem('google_pending_role')
  sessionStorage.removeItem('google_pending_invite_token')
  sessionStorage.removeItem('google_pending_school_id')
}

// ── Tabs config ───────────────────────────────────────────────────────────────

const tabs = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'teacher', label: 'Teacher', icon: School },
  { id: 'parent',  label: 'Parent',  icon: Users },
] as const

type TabType = typeof tabs[number]['id']

const relationOptions = [
  { value: 'father',   label: 'Father' },
  { value: 'mother',   label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other',    label: 'Other' },
]

// ── Expiry countdown hook ─────────────────────────────────────────────────────

function useTokenExpiry(googleToken: string): { secondsLeft: number; expired: boolean } {
  const decoded = decodeJwt(googleToken)
  const expTimestamp = decoded?.exp ?? 0

  const getSecondsLeft = useCallback(() => {
    return Math.max(0, Math.floor(expTimestamp - Date.now() / 1000))
  }, [expTimestamp])

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft)

  useEffect(() => {
    if (!expTimestamp) return
    const id = setInterval(() => {
      const remaining = getSecondsLeft()
      setSecondsLeft(remaining)
      if (remaining === 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [expTimestamp, getSecondsLeft])

  return { secondsLeft, expired: secondsLeft === 0 }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function GoogleCompleteProfilePage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const session = readSignupSession()

  // Determine initial tab from sessionStorage hint or default to 'student'.
  const hintRole = sessionStorage.getItem('google_pending_role') as TabType | null
  const validRoles: TabType[] = ['student', 'teacher', 'parent']
  const initialTab: TabType =
    hintRole && validRoles.includes(hintRole) ? hintRole : 'student'

  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Guard: no session → bounce back to login.
  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          No signup session found.{' '}
          <Link to="/login" className="font-semibold text-primary hover:text-primary/80">
            Return to login
          </Link>
        </p>
      </div>
    )
  }

  const { google_token, email, full_name, avatar_url } = session

  /** Called by student/teacher forms on successful API response. */
  const handleTokenSuccess = (tokens: TokenResponse) => {
    const decoded = decodeJwt(tokens.access_token)
    const user: User = {
      id: decoded?.sub ?? '',
      email: decoded?.email ?? email,
      full_name: full_name || null,
      role: decoded?.role ?? 'student',
      school_id: decoded?.school_id ?? null,
      is_active: true,
      is_email_verified: true,
      avatar_url: decoded?.avatar_url ?? avatar_url ?? null,
    }
    login(tokens, user)
    clearSignupSession()
    toast.success('Account created! Welcome 🎉')
    navigate('/', { replace: true })
  }

  /** Called by parent form on 202 pending_approval response. */
  const handleParentPending = (message: string) => {
    clearSignupSession()
    toast.success(message, { duration: 6000 })
    navigate('/login', { replace: true })
  }

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="mb-6">
        {/* Google avatar + identity badge */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-xl border border-border/50">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={full_name ?? 'Google profile'}
              className="h-10 w-10 rounded-full ring-2 ring-primary/30 shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-lg">
                {(full_name ?? email)[0]?.toUpperCase() ?? 'G'}
              </span>
            </div>
          )}
          <div className="min-w-0">
            {full_name && (
              <p className="text-sm font-semibold text-foreground truncate">{full_name}</p>
            )}
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Complete your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your role and fill in the details to finish setting up your account.
        </p>
      </div>

      {/* Expiry countdown */}
      <ExpiryBanner googleToken={google_token} />

      {/* Role tabs */}
      <div className="mb-6 flex gap-1 p-1.5 bg-muted rounded-xl border border-border/50">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-lg transition-all duration-300 ${
                isActive
                  ? 'text-primary bg-background shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Form area */}
      <div className="relative min-h-[320px]">
        {activeTab === 'student' && (
          <StudentCompleteForm
            googleToken={google_token}
            prefillName={full_name ?? ''}
            onSuccess={handleTokenSuccess}
          />
        )}
        {activeTab === 'teacher' && (
          <TeacherCompleteForm
            googleToken={google_token}
            prefillName={full_name ?? ''}
            onSuccess={handleTokenSuccess}
          />
        )}
        {activeTab === 'parent' && (
          <ParentCompleteForm
            googleToken={google_token}
            prefillName={full_name ?? ''}
            onPending={handleParentPending}
          />
        )}
      </div>
    </div>
  )
}

// ── Expiry banner ─────────────────────────────────────────────────────────────

function ExpiryBanner({ googleToken }: { googleToken: string }) {
  const { secondsLeft, expired } = useTokenExpiry(googleToken)

  if (expired) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Session expired.{' '}
          <Link to="/login" className="font-semibold underline underline-offset-2 hover:no-underline">
            Sign in with Google again
          </Link>{' '}
          to restart.
        </span>
      </div>
    )
  }

  const isWarning = secondsLeft < 5 * 60 // last 5 minutes
  return (
    <div
      className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
        isWarning
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
          : 'border-border/50 bg-muted text-muted-foreground'
      }`}
    >
      <Clock className={`h-3.5 w-3.5 shrink-0 ${isWarning ? 'text-amber-500' : ''}`} />
      <span>
        Session expires in{' '}
        <span className={`font-mono font-bold ${isWarning ? 'text-amber-600 dark:text-amber-400' : ''}`}>
          {formatCountdown(secondsLeft)}
        </span>
      </span>
    </div>
  )
}

// ── Shared props ──────────────────────────────────────────────────────────────

interface CompleteFormProps {
  googleToken: string
  prefillName: string
  onSuccess: (tokens: TokenResponse) => void
}

interface ParentFormProps {
  googleToken: string
  prefillName: string
  onPending: (message: string) => void
}

// ── Student form ──────────────────────────────────────────────────────────────

function StudentCompleteForm({ googleToken, prefillName, onSuccess }: CompleteFormProps) {
  const hintSchoolId = sessionStorage.getItem('google_pending_school_id') ?? ''

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoogleCompleteStudentFormData>({
    resolver: zodResolver(googleCompleteStudentSchema),
    defaultValues: {
      full_name: prefillName || undefined,
      school_id: hintSchoolId || undefined,
    },
  })

  const onSubmit = async (data: GoogleCompleteStudentFormData) => {
    try {
      const result = await authApi.googleCompleteRegistration({
        google_token: googleToken,
        role: 'student',
        full_name: data.full_name || undefined,
        school_id: data.school_id,
        class_code: data.class_code,
      })
      if ('access_token' in result) {
        onSuccess(result as TokenResponse)
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300" noValidate>
      <p className="text-xs text-muted-foreground bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
        Students need a <strong>School ID</strong> and a <strong>Class Code</strong> provided by their teacher.
      </p>

      <AuthInput
        type="text"
        autoComplete="name"
        placeholder="Full name"
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <AuthInput
        type="text"
        placeholder="School ID (UUID)"
        hint="UUID of your school"
        error={errors.school_id?.message}
        {...register('school_id')}
      />

      <AuthInput
        type="text"
        placeholder="Class Code"
        hint="Provided by your class teacher"
        error={errors.class_code?.message}
        {...register('class_code')}
      />

      <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
        Join as Student
      </AuthButton>
    </form>
  )
}

// ── Teacher form ──────────────────────────────────────────────────────────────

function TeacherCompleteForm({ googleToken, prefillName, onSuccess }: CompleteFormProps) {
  const hintInviteToken = sessionStorage.getItem('google_pending_invite_token') ?? ''

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoogleCompleteTeacherFormData>({
    resolver: zodResolver(googleCompleteTeacherSchema),
    defaultValues: {
      full_name: prefillName || undefined,
      invite_token: hintInviteToken || undefined,
    },
  })

  const onSubmit = async (data: GoogleCompleteTeacherFormData) => {
    try {
      const result = await authApi.googleCompleteRegistration({
        google_token: googleToken,
        role: 'teacher',
        full_name: data.full_name || undefined,
        invite_token: data.invite_token,
      })
      if ('access_token' in result) {
        onSuccess(result as TokenResponse)
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300" noValidate>
      <p className="text-xs text-muted-foreground bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
        Teachers need a <strong>64-character invite token</strong> from a principal invite link.
        Ask your school principal for an invite.
      </p>

      <AuthInput
        type="text"
        autoComplete="name"
        placeholder="Full name"
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <AuthInput
        type="text"
        placeholder="Invite Token (Hex)"
        hint="Paste the token from the invite email or link your principal shared"
        error={errors.invite_token?.message}
        {...register('invite_token')}
      />

      <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
        Join as Teacher
      </AuthButton>
    </form>
  )
}

// ── Parent form ───────────────────────────────────────────────────────────────

function ParentCompleteForm({ googleToken, prefillName, onPending }: ParentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoogleCompleteParentFormData>({
    resolver: zodResolver(googleCompleteParentSchema),
    defaultValues: { full_name: prefillName || undefined, relation: 'guardian' },
  })

  const onSubmit = async (data: GoogleCompleteParentFormData) => {
    try {
      const result = await authApi.googleCompleteRegistration({
        google_token: googleToken,
        role: 'parent',
        full_name: data.full_name || undefined,
        school_id: data.school_id,
        student_id: data.student_id,
        relation: data.relation,
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300" noValidate>
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

      <AuthInput
        type="text"
        placeholder="School ID (UUID)"
        hint="UUID of the school where your child is enrolled"
        error={errors.school_id?.message}
        {...register('school_id')}
      />

      <AuthInput
        type="text"
        placeholder="Student ID (UUID)"
        hint="UUID of your child's student account"
        error={errors.student_id?.message}
        {...register('student_id')}
      />

      <Select
        label="Relationship to student"
        options={relationOptions}
        error={errors.relation?.message}
        {...register('relation')}
      />

      <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
        Register as Parent
      </AuthButton>
    </form>
  )
}
