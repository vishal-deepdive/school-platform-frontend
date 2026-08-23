import { cn } from "@/shared/lib/utils";

import { motion } from "framer-motion";
import { cardHover } from "@/features/landing/animations";

/**
 * Renders a stat value, easing the number up on mount/change. Animates only a
 * single, clean numeric core (e.g. `42`, `85%`, `1,234`) so prefix/suffix and
 * multi-number strings like "2h 30m" or em-dashes render verbatim.
 */

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
  default: "bg-card border-border/60 shadow-[0_1px_3px_0_rgba(0,0,0,0.03),0_1px_2px_-1px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.3)]",
  glass: "bg-card/70 backdrop-blur-md border-border/40 dark:bg-card/45 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.3)]",
  gradient: "bg-gradient-to-br from-card via-card to-muted/10 border-border/60 shadow-[0_1px_3px_0_rgba(0,0,0,0.03),0_1px_2px_-1px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.3)]",
};

export function Card({
  children,
  className,
  padding = "md",
  hoverable = false,
  variant = "default",
}: CardProps) {
  const Component = hoverable ? motion.div : ("div" as any);
  return (
    <Component
      className={cn(
        "rounded-xl border",
        !hoverable && "transition-all duration-300 ease-out",
        variantClasses[variant],
        hoverable && "cursor-pointer hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 dark:hover:border-primary/35",
        paddingClasses[padding],
        className,
      )}
      {...(hoverable ? {
        variants: cardHover,
        initial: "rest",
        whileHover: "hover",
      } : {})}
    >
      {children}
    </Component>
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
  primary: "bg-primary/12 text-primary border border-primary/15",
  success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15",
  warning: "bg-amber-500/12 text-amber-600 dark:text-amber-400 border border-amber-500/15",
  danger:  "bg-rose-500/12 text-rose-600 dark:text-rose-400 border border-rose-500/15",
  info:    "bg-sky-500/12 text-sky-600 dark:text-sky-400 border border-sky-500/15",
};

export function StatCard({
  label,
  value,
  icon,
  color = "primary",
  className,
  description,
  hoverable = true,
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
          {/* <AnimatedStat value={value} /> */}
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

