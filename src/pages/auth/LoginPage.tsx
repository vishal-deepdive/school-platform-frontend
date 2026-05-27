import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth'
import { LoginForm } from '@/features/auth/components'

export function LoginPage() {
  const location = useLocation()
  const { logout } = useAuthStore()
  
  const locationState = location.state as { from?: { pathname: string }; incompleteProfile?: boolean } | null
  const from = locationState?.from?.pathname ?? '/'

  useEffect(() => {
    if (locationState?.incompleteProfile) {
      logout()
      toast.error(
        'Your account profile is incomplete. Please sign in with Google again to finish setup.',
        { duration: 6000 },
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto grid w-full max-w-[350px] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-2 text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground">Sign in to your account</h1>
        <p className="text-balance text-sm text-muted-foreground">Enter your email below to sign in</p>
      </div>

      <LoginForm redirectPath={from} />
    </div>
  )
}
