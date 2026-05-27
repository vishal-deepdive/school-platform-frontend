import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { GraduationCap, Users, School, ShieldAlert, MailOpen } from 'lucide-react'
import { AuthButton } from '@/components/ui/auth-fuse'
import {
  TeacherInviteRegisterForm,
  StudentRegisterForm,
  ParentRegisterForm,
} from '@/features/auth/components'

/** Invite codes must be exactly 8 characters from the invite code alphabet (letters + digits 2–9). */
function isValidTokenFormat(token: string): boolean {
  return /^[A-Za-z2-9]{8}$/.test(token)
}

const tabs = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'parent',  label: 'Parent',  icon: Users },
] as const

type TabType = typeof tabs[number]['id']

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const tokenParam  = searchParams.get('token')
  const schoolParam = searchParams.get('school') || searchParams.get('school_id')
  const roleParam   = searchParams.get('role')

  const initialTab: TabType = roleParam === 'parent' ? 'parent' : 'student'
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  if (tokenParam !== null) {
    const trimmedToken = tokenParam.trim()

    if (!trimmedToken || !isValidTokenFormat(trimmedToken)) {
      return (
        <div className="mx-auto grid w-full max-w-[400px] gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Invalid Invite Link</h1>
            <p className="text-sm text-muted-foreground text-balance">
              This teacher invite link is invalid or has been corrupted.
              Please ask your school principal to resend the invite.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <AuthButton asChild variant="outline" className="w-full">
              <Link to="/register">Register as Student or Parent</Link>
            </AuthButton>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="mx-auto grid w-full max-w-[400px] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center gap-2 text-center mb-1">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-1">
            <MailOpen className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Teacher Invite</h1>
          <p className="text-sm text-muted-foreground text-balance">
            You've been invited to join as a teacher by your school principal.
            Complete your registration below.
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <School className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Invite link detected.</span>{' '}
            Your invite token will be verified when you create your account.
          </p>
        </div>

        <div className="relative px-1">
          <TeacherInviteRegisterForm inviteToken={trimmedToken} navigate={navigate} />
        </div>

        <p className="text-center text-sm mt-1">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-2 text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your details below to sign up
        </p>
      </div>

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
                <Icon
                  className={`h-4.5 w-4.5 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <span>{tab.label}</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="relative px-1">
        {activeTab === 'student' && (
          <StudentRegisterForm defaultSchoolId={schoolParam || ''} navigate={navigate} />
        )}
        {activeTab === 'parent' && (
          <ParentRegisterForm defaultSchoolId={schoolParam || ''} navigate={navigate} />
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-muted/50 px-3 py-3 mt-1">
        <School className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Are you a teacher?</span>{' '}
          Teacher accounts are created via an invite link sent by your school principal.
          Contact your principal if you haven't received one.
        </p>
      </div>

      <p className="text-center text-sm mt-2">
        Already have an account?{' '}
        <Link
          to="/login"
          className="pl-1 font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
