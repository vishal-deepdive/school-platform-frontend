import { cn } from "@/shared/lib/utils";
import { useCountUp } from "@/shared/hooks/useCountUp";

/**
 * Renders a stat value, easing the number up on mount/change. Animates only a
 * single, clean numeric core (e.g. `42`, `85%`, `1,234`) so prefix/suffix and
 * multi-number strings like "2h 30m" or em-dashes render verbatim.
 */
function AnimatedStat({ value }: { value: string | number }) {
  const raw = typeof value === "number" ? String(value) : value;
  const match = raw.match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(\D*)$/);
  const target = match ? Number(match[2].replace(/,/g, "")) : NaN;
  const animated = useCountUp(Number.isFinite(target) ? target : 0);

  if (!match || !Number.isFinite(target)) return <>{raw}</>;

  const [, prefix, numStr, suffix] = match;
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  const grouped = numStr.includes(",");
  const shown = animated.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });
  return (
    <>
      {prefix}
      {shown}
      {suffix}
    </>
  );
}

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
  /**
   * Only set when the card is actually clickable (wrapped in a Link/button) —
   * it adds cursor-pointer + lift, and a hover affordance that does nothing
   * when clicked erodes trust in every real one.
   */
  hoverable?: boolean;
}

const statColors: Record<StatCardColor, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-green-500/10 text-green-600 dark:text-green-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger:  "bg-destructive/10 text-destructive",
  info:    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export function StatCard({
  label,
  value,
  icon,
  color = "primary",
  className,
  description,
  hoverable = false,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "group flex h-full flex-col justify-between overflow-hidden relative",
        className,
      )}
      padding="md"
      hoverable={hoverable}
    >
      <div className="flex items-start justify-between w-full">
        <p className="eyebrow leading-none mt-1">{label}</p>
        {icon && (
          <div
            className={cn(
              "flex-shrink-0 rounded-lg p-2",
              statColors[color],
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="font-display text-3xl font-semibold text-foreground tracking-tight tabular-nums">
          <AnimatedStat value={value} />
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

