import { forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "flex w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
            "transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-background",
            error
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : "border-input focus:border-primary focus:ring-primary/20 hover:border-primary/50",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-xs font-medium text-destructive mt-0.5">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
