import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/shared/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  /**
   * Render as the child element (e.g. a react-router <Link>) instead of a
   * <button>, keeping button styling. When set, `loading`/`icon` are ignored
   * because the child owns its content.
   */
  asChild?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 focus-visible:ring-primary disabled:bg-primary/50",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-secondary disabled:bg-secondary/50 disabled:text-secondary-foreground/50",
  danger:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive disabled:bg-destructive/50",
  ghost:
    "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent",
  outline:
    "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      icon,
      children,
      className,
      disabled,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const classes = cn(
      "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "active:scale-[0.98]",
      "disabled:cursor-not-allowed disabled:active:scale-100",
      variantClasses[variant],
      sizeClasses[size],
      className,
    );

    if (asChild) {
      // Child (e.g. <Link>) owns its content; Slot merges classes/props onto it.
      return (
        <Slot ref={ref} className={classes} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={classes}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
