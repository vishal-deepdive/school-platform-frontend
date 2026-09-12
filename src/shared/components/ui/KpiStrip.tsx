import { cn } from "@/shared/lib/utils";
import type { StatCardColor } from "./Card";
import { Skeleton } from "./Skeleton";

export interface KpiItem {
  label: string;
  value: React.ReactNode;
  /** One short supporting line, e.g. "12 global · 30 school". */
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** Tints the icon only; hue is reserved for status meaning. */
  tone?: StatCardColor;
}

const TONE: Record<StatCardColor, string> = {
  primary: "text-primary",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
  info: "text-sky-600 dark:text-sky-400",
};

// Static class names so Tailwind keeps them. Strips are meant for 2–4 metrics.
const COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

interface KpiStripProps {
  items: KpiItem[];
  loading?: boolean;
  className?: string;
}

/**
 * A slim, hairline-divided row of headline numbers for dashboard pages —
 * one card instead of a grid of large stat tiles.
 */
export function KpiStrip({ items, loading, className }: KpiStripProps) {
  const count = Math.min(Math.max(items.length, 1), 4);
  // Two-column phones: an odd last cell spans the row instead of leaving a gap.
  const oddOnPhones = items.length % 2 === 1 && items.length > 1;

  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 shadow-card",
        COLUMNS[count],
        className,
      )}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "min-w-0 bg-card px-4 py-3 md:px-5",
            oddOnPhones && i === items.length - 1 && "col-span-2 sm:col-span-1",
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {item.icon && (
              <span
                className={cn(
                  "flex [&_svg]:h-3.5 [&_svg]:w-3.5",
                  TONE[item.tone ?? "primary"],
                )}
              >
                {item.icon}
              </span>
            )}
            <span className="truncate">{item.label}</span>
          </div>
          {loading ? (
            <>
              <Skeleton className="mt-2 h-7 w-16" />
              {item.hint !== undefined && <Skeleton className="mt-1.5 h-3 w-24" />}
            </>
          ) : (
            <>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {item.value}
              </p>
              {item.hint && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.hint}</p>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
