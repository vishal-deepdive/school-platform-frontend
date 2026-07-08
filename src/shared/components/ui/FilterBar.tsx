import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface FilterBarProps {
  children: React.ReactNode;
  /** Right-aligned action row (buttons) rendered in a divided footer. */
  actions?: React.ReactNode;
  /** Optional small header label; defaults to a "Filters" caption. */
  title?: string;
  icon?: React.ReactNode;
  /** Hide the caption row entirely. */
  hideHeader?: boolean;
  className?: string;
}

/**
 * Refined control panel that heads most module pages: a labelled surface for
 * scope/date filters with a clearly separated, right-aligned action footer.
 * Replaces the ad-hoc "big Card with a stray button" pattern so every page's
 * query controls read the same way.
 */
export function FilterBar({
  children,
  actions,
  title = "Filters",
  icon,
  hideHeader = false,
  className,
}: FilterBarProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
    >
      <div className="space-y-4 p-4 md:p-5">
        {!hideHeader && (
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon ?? <SlidersHorizontal className="h-4 w-4" />}
            <span className="eyebrow">{title}</span>
          </div>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 bg-muted/30 px-4 py-3 md:px-5 dark:bg-black/20">
          {actions}
        </div>
      )}
    </section>
  );
}
