import { forwardRef, useId } from "react";
import { cn } from "@/shared/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const reactId = useId();
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-") ?? reactId;
    const messageId = `${reactId}-message`;
    const hasMessage = !!(error || hint);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          className={cn(
            "flex w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
            "transition-colors duration-200 resize-none",
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
          <p id={messageId} className="text-xs font-medium text-destructive mt-0.5">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={messageId} className="text-xs text-muted-foreground mt-0.5">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
