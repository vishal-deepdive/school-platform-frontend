import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface FormSectionProps {
  title: string;
  /** One line on what this group is for, or what the school should enter. */
  description?: React.ReactNode;
  /** Right-aligned control in the section header (e.g. a mode switch). */
  action?: React.ReactNode;
  /** Tags the whole group as optional, so required fields stand out. */
  optional?: boolean;
  /**
   * Shows a numbered badge, turning a long form into visible steps. Pass it on
   * every section of a form or none — a half-numbered form reads as a bug.
   */
  step?: number;
  /** Ticks this step's badge once its fields are filled in. */
  complete?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * One labelled group of fields inside a form. Sections stack with a hairline
 * between them, so a long form reads as a few short steps instead of a wall of
 * inputs. Pair with `FormActions` for the submit row.
 */
export function FormSection({
  title,
  description,
  action,
  optional = false,
  step,
  complete = false,
  children,
  className,
}: FormSectionProps) {
  const numbered = step !== undefined;

  return (
    <section
      className={cn(
        "border-t border-border/50 pt-5 first:border-t-0 first:pt-0",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {numbered && (
            <span
              aria-hidden="true"
              className={cn(
                "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors",
                complete
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/60 text-muted-foreground",
              )}
            >
              {complete ? <Check className="h-3 w-3" strokeWidth={3} /> : step}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {title}
              {optional && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Optional
                </span>
              )}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {/* Indent the fields under a numbered heading so the steps read as a rail. */}
      <div className={cn(numbered && "sm:pl-[30px]")}>{children}</div>
    </section>
  );
}
