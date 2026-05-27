import { AuthInput, AuthSelect } from '@/components/ui/auth-fuse'
import { SCHOOL_BOARDS, SCHOOL_TYPES } from '@/lib/validators'
import type { StepPropsExtra } from './types'

export function SchoolInfoStep({ register, errors, watch }: StepPropsExtra) {
  const selectedBoard = watch('board')
  return (
    <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
      <AuthInput
        label="School Name *"
        type="text"
        placeholder="e.g. Springfield Elementary School"
        autoComplete="organization"
        error={errors.school_name?.message}
        {...register('school_name')}
      />

      <AuthSelect
        label="Curriculum Board *"
        error={errors.board?.message}
        {...register('board')}
      >
        <option value="">— Select board —</option>
        {SCHOOL_BOARDS.map((b) => (
          <option key={b.value} value={b.value}>{b.label}</option>
        ))}
      </AuthSelect>

      {selectedBoard === 'OTHER' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <AuthInput
            label="Please specify board *"
            type="text"
            placeholder="e.g. State Board of Technical Education"
            error={errors.other_board?.message}
            {...register('other_board')}
          />
        </div>
      )}

      <AuthSelect
        label="School Type *"
        error={errors.school_type?.message}
        {...register('school_type')}
      >
        <option value="">— Select type —</option>
        {SCHOOL_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </AuthSelect>

      <AuthInput
        label="Year Established"
        type="number"
        inputMode="numeric"
        min={1800}
        max={new Date().getFullYear()}
        placeholder={`e.g. 1995`}
        error={errors.established_year?.message}
        hint="Optional — the year your school was founded"
        {...register('established_year')}
      />
    </div>
  )
}
