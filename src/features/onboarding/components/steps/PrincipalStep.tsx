import { AuthInput, AuthPasswordInput } from '@/components/ui/auth-fuse'
import { Link } from 'react-router-dom'
import type { StepPropsExtra } from './types'

export function PrincipalStep({ register, errors }: StepPropsExtra) {
  return (
    <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Create the <strong className="text-foreground">principal account</strong> for the person
          submitting this application. Once approved by the admin, use these credentials to
          manage the school.
        </p>
      </div>

      <AuthInput
        label="Principal Full Name *"
        type="text"
        autoComplete="name"
        placeholder="Full name of the principal"
        error={errors.principal_name?.message}
        {...register('principal_name')}
      />

      <AuthInput
        label="Principal Email *"
        type="email"
        autoComplete="email"
        placeholder="principal@yourschool.edu.in"
        error={errors.principal_email?.message}
        hint="This will be the principal's login email address"
        {...register('principal_email')}
      />

      <AuthPasswordInput
        label="Password *"
        autoComplete="new-password"
        placeholder="Create a strong password"
        error={errors.principal_password?.message}
        hint="Min 8 chars — uppercase, lowercase, number & special character"
        {...register('principal_password')}
      />

      <AuthPasswordInput
        label="Confirm Password *"
        autoComplete="new-password"
        placeholder="Repeat your password"
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />

      <div className="flex flex-col gap-1.5 mt-1">
        <div className="flex items-start gap-3">
          <input
            id="onboarding-terms"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer shrink-0"
            {...register('terms')}
          />
          <label
            htmlFor="onboarding-terms"
            className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
          >
            I confirm that all provided details are accurate and I accept the{' '}
            <Link
              to="#"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Terms &amp; Conditions
            </Link>
          </label>
        </div>
        {errors.terms?.message && (
          <p className="text-xs text-destructive font-medium pl-7">{errors.terms.message}</p>
        )}
      </div>
    </div>
  )
}
