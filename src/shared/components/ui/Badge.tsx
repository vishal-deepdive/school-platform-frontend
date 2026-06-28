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
  default: "bg-secondary text-secondary-foreground border border-border/50",
  primary: "bg-primary/10 text-primary border border-primary/20",
  success:
    "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
  warning:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  danger: "bg-destructive/10 text-destructive border border-destructive/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
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
