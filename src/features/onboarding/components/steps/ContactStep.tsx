import { AuthInput, AuthSelect } from '@/components/ui/auth-fuse'
import { INDIAN_STATES } from '@/lib/validators'
import type { StepProps } from './types'

export function ContactStep({ register, errors }: StepProps) {
  return (
    <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
      <AuthInput
        label="Official School Email *"
        type="email"
        autoComplete="email"
        placeholder="admin@yourschool.edu.in"
        error={errors.email?.message}
        hint="School's primary contact email address"
        {...register('email')}
      />

      <div className="grid grid-cols-2 gap-3">
        <AuthInput
          label="Mobile Number *"
          type="tel"
          inputMode="numeric"
          placeholder="10-digit number"
          maxLength={10}
          error={errors.mobile?.message}
          hint="Without country code"
          {...register('mobile')}
        />
        <AuthInput
          label="Office Phone"
          type="tel"
          placeholder="Landline (optional)"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <AuthInput
        label="Street Address *"
        type="text"
        placeholder="Building, Street, Area"
        autoComplete="street-address"
        error={errors.address_line_1?.message}
        {...register('address_line_1')}
      />

      <AuthInput
        label="Address Line 2"
        type="text"
        placeholder="Locality, Landmark (optional)"
        error={errors.address_line_2?.message}
        {...register('address_line_2')}
      />

      <div className="grid grid-cols-2 gap-3">
        <AuthInput
          label="City *"
          type="text"
          autoComplete="address-level2"
          placeholder="City"
          error={errors.city?.message}
          {...register('city')}
        />
        <AuthInput
          label="PIN Code *"
          type="text"
          inputMode="numeric"
          placeholder="6-digit PIN"
          maxLength={6}
          autoComplete="postal-code"
          error={errors.pin_code?.message}
          {...register('pin_code')}
        />
      </div>

      <AuthSelect
        label="State *"
        error={errors.state?.message}
        {...register('state')}
      >
        <option value="">— Select state / UT —</option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </AuthSelect>
    </div>
  )
}
