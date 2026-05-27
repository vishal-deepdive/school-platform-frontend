import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { googleCompleteParentSchema, type GoogleCompleteParentFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { AuthInput, AuthButton } from '@/components/ui/auth-fuse'
import { Select } from '@/components/ui/Select'
import type { ParentFormProps } from './types'

const relationOptions = [
  { value: 'father',   label: 'Father' },
  { value: 'mother',   label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other',    label: 'Other' },
]

export function ParentCompleteForm({ googleToken, prefillName, onPending }: ParentFormProps) {
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
        role:         'parent',
        full_name:    data.full_name || undefined,
        school_id:    data.school_id,
        student_id:   data.student_id,
        relation:     data.relation,
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300"
      noValidate
    >
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
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <CheckCircle className="h-4 w-4 mr-2" />
        )}
        Register as Parent
      </AuthButton>
    </form>
  )
}
