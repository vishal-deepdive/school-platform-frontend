import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { googleCompleteStudentSchema, type GoogleCompleteStudentFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthButton } from '@/components/ui/auth-fuse'
import type { TokenResponse } from '@/types/auth'
import type { CompleteFormProps } from './types'

export function StudentCompleteForm({ googleToken, prefillName, onSuccess }: CompleteFormProps) {
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
        role:         'student',
        full_name:    data.full_name || undefined,
        school_id:    data.school_id,
        class_code:   data.class_code,
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
