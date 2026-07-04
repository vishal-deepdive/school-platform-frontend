import { cn } from "@/shared/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
  variant?: "default" | "glass" | "gradient";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const variantClasses = {
  default: "bg-card border-border/60",
  glass: "bg-card/70 backdrop-blur-md border-border/40 dark:bg-card/45",
  gradient: "bg-gradient-to-br from-card via-card to-muted/10 border-border/60",
};

export function Card({
  children,
  className,
  padding = "md",
  hoverable = false,
  variant = "default",
}: CardProps) {
  return (
    <div
      className={cn(
        // Flat at rest — elevation only appears on hover.
        "rounded-xl border shadow-none transition-all duration-300 ease-out",
        // "hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_10px_24px_-6px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_10px_28px_-8px_rgba(0,0,0,0.55)]",
        variantClasses[variant],
        hoverable &&
          "hover:-translate-y-0.5 hover:border-primary/25 dark:hover:border-primary/35 cursor-pointer",
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  bordered = false,
}: CardHeaderProps) {
  const hasText = title || description;
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-5 sm:mb-6",
        hasText ? "justify-between" : "justify-end",
        bordered && "border-b border-border/40 pb-4 sm:mb-5",
        className,
      )}
    >
      {hasText && (
        <div className="min-w-0">
          {title && (
            <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export type StatCardColor = "primary" | "success" | "warning" | "danger" | "info";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: StatCardColor;
  className?: string;
  description?: React.ReactNode;
}

const statColors: Record<StatCardColor, string> = {
  primary: "from-primary/20 to-primary/5 text-primary border-primary/10",
  success: "from-green-500/20 to-green-500/5 text-green-600 dark:text-green-400 border-green-500/10",
  warning: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/10",
  danger:  "from-destructive/20 to-destructive/5 text-destructive border-destructive/10",
  info:    "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/10",
};

export function StatCard({
  label,
  value,
  icon,
  color = "primary",
  className,
  description,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "group flex flex-col justify-between overflow-hidden relative",
        className,
      )}
      padding="md"
      hoverable
    >
      <div className="flex items-start justify-between w-full">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-none mt-1">
          {label}
        </p>
        {icon && (
          <div
            className={cn(
              "flex-shrink-0 rounded-xl p-2.5 bg-gradient-to-br border transition-transform duration-300 group-hover:scale-110",
              statColors[color],
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight tabular-nums">
          {value}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </Card>
  );
}

