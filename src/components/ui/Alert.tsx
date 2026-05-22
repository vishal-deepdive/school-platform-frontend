import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'

type AlertVariant = 'error' | 'success' | 'warning' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
  onClose?: () => void
}

const config: Record<AlertVariant, { icon: React.ElementType; classes: string }> = {
  error: { icon: AlertCircle, classes: 'bg-red-50 border-red-200 text-red-800' },
  success: { icon: CheckCircle2, classes: 'bg-green-50 border-green-200 text-green-800' },
  warning: { icon: AlertTriangle, classes: 'bg-amber-50 border-amber-200 text-amber-800' },
  info: { icon: Info, classes: 'bg-blue-50 border-blue-200 text-blue-800' },
}

export function Alert({ variant = 'info', title, children, className, onClose }: AlertProps) {
  const { icon: Icon, classes } = config[variant]
  return (
    <div className={cn('flex gap-3 rounded-lg border p-4', classes, className)} role="alert">
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
