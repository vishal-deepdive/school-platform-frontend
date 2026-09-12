import { cn } from "@/shared/lib/utils";

interface FormActionsProps {
  /** Buttons, primary last. */
  children: React.ReactNode;
  /** Left-side context: what will happen, what's still missing, live counts. */
  info?: React.ReactNode;
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
export function FormActions({ children, info, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/95 px-4 py-3 shadow-card backdrop-blur md:px-5",
        className,
      )}
    >
      <div className="min-w-0 text-xs text-muted-foreground">{info}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
