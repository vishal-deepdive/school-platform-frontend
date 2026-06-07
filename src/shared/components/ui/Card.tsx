import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-background/95 backdrop-blur-md shadow-sm shadow-black/5 border border-border/50',
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div>
        <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'indigo' | 'green' | 'amber' | 'red' | 'blue'
  className?: string
}

const statColors = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  // Legacy aliases
  indigo: 'bg-primary/10 text-primary',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  red: 'bg-destructive/10 text-destructive',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
}

export function StatCard({ label, value, icon, color = 'primary', className }: StatCardProps) {
  return (
    <Card className={cn('flex items-center gap-4 transition-all hover:shadow-md hover:border-primary/20', className)} padding="md">
      {icon && (
        <div className={cn('flex-shrink-0 rounded-lg p-3', statColors[color])}>{icon}</div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground truncate">{label}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      </div>
    </Card>
  )
}
