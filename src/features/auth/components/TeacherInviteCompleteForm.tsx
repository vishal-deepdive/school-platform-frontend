import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { googleCompleteTeacherInviteSchema, type GoogleCompleteTeacherInviteFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthButton } from '@/components/ui/auth-fuse'
import type { TokenResponse } from '@/types/auth'
import type { CompleteFormProps } from './types'

export function TeacherInviteCompleteForm({
  googleToken,
  prefillName,
  inviteToken,
  onSuccess,
}: CompleteFormProps & { inviteToken: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoogleCompleteTeacherInviteFormData>({
    resolver: zodResolver(googleCompleteTeacherInviteSchema),
    defaultValues: { full_name: prefillName || undefined },
  })

  const onSubmit = async (data: GoogleCompleteTeacherInviteFormData) => {
    try {
      const result = await authApi.googleCompleteRegistration({
        google_token:  googleToken,
        role:          'teacher',
        full_name:     data.full_name || undefined,
        invite_token:  inviteToken,    // injected from sessionStorage — hidden from UI
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
      <AuthInput
        type="text"
        autoComplete="name"
        placeholder="Full name (optional)"
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <AuthButton type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <CheckCircle className="h-4 w-4 mr-2" />
        )}
        Join as Teacher
      </AuthButton>
    </form>
  )
}
