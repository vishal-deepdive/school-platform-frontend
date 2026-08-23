import { cn } from "@/shared/lib/utils";

interface PanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Right-aligned header slot: counts, filters, or actions. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Drop body padding — use for tables and full-bleed row lists. */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
}

/**
 * Titled content section: an optional header (icon + title + description on the
 * left, actions on the right) above a card body. The single home for the
 * "card with a bordered header bar" layout that every list/table page used to
 * hand-roll, so headers, spacing and dividers stay consistent module-wide.
 */
export function Panel({
  title,
  description,
  icon,
  actions,
  children,
  flush = false,
  className,
  bodyClassName,
}: PanelProps) {
  const hasHeader = title || actions;
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.03),0_1px_2px_-1px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.3)]",
        className,
      )}
    >
      {hasHeader && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 md:px-5 bg-card">
          {title ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {icon && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-2xs">
                  {icon}
                </span>
              )}
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {title}
                </h3>
                {description && (
                  <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                    {description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <span />
          )}
          {actions && (
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={cn(!flush && "p-4 md:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
