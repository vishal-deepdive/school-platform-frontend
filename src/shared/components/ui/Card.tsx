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
  default: "bg-card border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_20px_-5px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]",
  glass: "bg-card/70 backdrop-blur-md border-border/30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:bg-card/45",
  gradient: "bg-gradient-to-br from-card via-card to-muted/10 border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_20px_-5px_rgba(0,0,0,0.04)]",
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
        "rounded-xl border transition-all duration-300 ease-out",
        variantClasses[variant],
        hoverable &&
          "hover:-translate-y-1 hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.03)] hover:border-primary/20 dark:hover:border-primary/30 cursor-pointer",
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
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
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 mb-6",
        bordered && "border-b border-border/40 pb-4 mb-5",
        className,
      )}
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "indigo"
    | "green"
    | "amber"
    | "red"
    | "blue";
  className?: string;
  description?: React.ReactNode;
}

const _PRIMARY = "from-primary/20 to-primary/5 text-primary border-primary/10";
const _GREEN   = "from-green-500/20 to-green-500/5 text-green-600 dark:text-green-400 border-green-500/10";
const _AMBER   = "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/10";
const _RED     = "from-destructive/20 to-destructive/5 text-destructive border-destructive/10";
const _BLUE    = "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/10";

const statColors = {
  primary: _PRIMARY, indigo: _PRIMARY,
  success: _GREEN,   green:  _GREEN,
  warning: _AMBER,   amber:  _AMBER,
  danger:  _RED,     red:    _RED,
  info:    _BLUE,    blue:   _BLUE,
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
        <p className="text-3xl font-extrabold text-foreground tracking-tight">
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

