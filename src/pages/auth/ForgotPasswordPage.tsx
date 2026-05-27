import { Mail } from 'lucide-react'
import { ForgotPasswordForm } from '@/features/auth/components'

export function ForgotPasswordPage() {
  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center sm:text-left">
        <div className="mb-6 flex justify-center sm:justify-start">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
            <Mail className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Forgot password?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we'll send you a reset OTP.
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  )
}
