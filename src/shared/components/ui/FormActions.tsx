import { cn } from "@/shared/lib/utils";

interface FormActionsProps {
  /** Buttons, primary last. */
  children: React.ReactNode;
  /** Left-side context: what will happen, what's still missing, live counts. */
  info?: React.ReactNode;
  /**
   * How much of the form is filled in, as a fraction of its steps. Draws a
   * hairline fill across the top of the bar so progress is visible without
   * scrolling back up. Pair with `FormSection`'s `step`/`complete`.
   */
  progress?: { done: number; total: number };
  className?: string;
}

/**
 * Submit row for a long form, pinned to the bottom of the viewport so the
 * primary action stays reachable without scrolling back down.
 *
 * Render it as a SIBLING of the form's card, not inside it: a `Panel` clips its
 * content (`overflow-hidden`), which makes it the sticky positioning container
 * and pins the bar to the card's own bottom edge instead of the screen.
 */
export function FormActions({ children, info, progress, className }: FormActionsProps) {
  const pct =
    progress && progress.total > 0
      ? Math.round((Math.min(progress.done, progress.total) / progress.total) * 100)
      : null;

  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/95 px-4 py-3 shadow-card backdrop-blur md:px-5",
        className,
      )}
    >
      {pct !== null && (
        <div
          className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-xl bg-border/60"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Form completion"
        >
          <div
            className="h-full rounded-r-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div className="min-w-0 text-xs text-muted-foreground">{info}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
