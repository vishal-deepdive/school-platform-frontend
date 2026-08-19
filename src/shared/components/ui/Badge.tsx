import { cn } from "@/shared/lib/utils";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "primary"
  | "purple"
  | "indigo";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-secondary text-secondary-foreground border border-border/70 shadow-2xs font-semibold",
  primary: "bg-primary/15 text-primary border border-primary/25 shadow-2xs font-semibold",
  success:
    "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 shadow-2xs font-semibold",
  warning:
    "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25 shadow-2xs font-semibold",
  danger: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/25 shadow-2xs font-semibold",
  info: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/25 shadow-2xs font-semibold",
  purple: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/25 shadow-2xs font-semibold",
  indigo: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/25 shadow-2xs font-semibold",
};

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
