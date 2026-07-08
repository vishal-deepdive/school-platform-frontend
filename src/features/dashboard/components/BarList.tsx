import { cn } from "@/shared/lib/utils";

export interface BarListItem {
  label: string;
  value: number;
  /** Optional secondary text shown next to the label (e.g. "· 120m"). */
  hint?: string;
  /** Override the bar color (any CSS color). Defaults to the primary color. */
  color?: string;
}

interface BarListProps {
  items: BarListItem[];
  /** Format the numeric value shown on the right (defaults to the raw number). */
  format?: (v: number) => string;
  /** Fix the bar scale (e.g. 100 for percentages); defaults to the max value. */
  max?: number;
  className?: string;
  emptyLabel?: string;
}

/**
 * Compact horizontal bar list (label + proportional bar + value) — the
 * div-based ranked-breakdown pattern used across the dashboard. Lighter than a
 * Recharts chart for simple "top N" lists and consistent in light/dark mode.
 */
export function BarList({
  items,
  format,
  max,
  className,
  emptyLabel = "No data yet.",
}: BarListProps) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }
  const scale = Math.max(1, max ?? Math.max(...items.map((i) => i.value)));
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm text-foreground">
              {it.label}
              {it.hint && (
                <span className="ml-1.5 text-xs text-muted-foreground">{it.hint}</span>
              )}
            </p>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
              {format ? format(it.value) : it.value}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.round((it.value / scale) * 100))}%`,
                backgroundColor: it.color ?? "oklch(var(--primary))",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
