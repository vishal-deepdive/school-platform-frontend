import { forwardRef, useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface TermsCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  /**
   * Override the label text. Defaults to the standard "I accept the Terms & Conditions".
   * Pass a ReactNode for rich content.
   */
  label?: ReactNode
}

/**
 * Controlled terms-and-conditions checkbox compatible with React Hook Form's
 * register() — just spread the return value of register('terms') onto this component.
 */
export const TermsCheckbox = forwardRef<HTMLInputElement, TermsCheckboxProps>(
  ({ error, id: externalId, className, label, ...props }, ref) => {
    const generatedId = useId()
    const id = externalId ?? generatedId

    const labelContent: ReactNode = label ?? (
      <>
        I accept the{' '}
        <Link
          to="#"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Terms &amp; Conditions
        </Link>
      </>
    )

    return (
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id={id}
            ref={ref}
            className={cn(
              'mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer transition-colors',
              error && 'border-destructive',
              className,
            )}
            {...props}
          />
          <label
            htmlFor={id}
            className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none"
          >
            {labelContent}
          </label>
        </div>
        {error && (
          <p className="text-xs text-destructive font-medium pl-6">{error}</p>
        )}
      </div>
    )
  },
)
TermsCheckbox.displayName = 'TermsCheckbox'
