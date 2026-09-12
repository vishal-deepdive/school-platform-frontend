import { Fragment } from "react";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "./Skeleton";

export interface StatLineItem {
  /** Emphasised number (or short text) shown before the label. */
  value?: number | string;
  label: React.ReactNode;
  /** Status tone — only for things that need attention or are done. */
  tone?: "default" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
  /** Turns the item into a shortcut, e.g. "3 failed — review". */
  onClick?: () => void;
  hidden?: boolean;
}

const TONE: Record<NonNullable<StatLineItem["tone"]>, string> = {
  default: "",
  success: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-300",
  danger: "text-rose-700 dark:text-rose-300",
};

interface StatLineProps {
  items: StatLineItem[];
  loading?: boolean;
  className?: string;
}

/**
 * One muted line of totals ("128 users · 4 inactive") — the list-page
 * replacement for a row of large stat cards. Dashboards use `KpiStrip`.
 */
export function StatLine({ items, loading, className }: StatLineProps) {
  if (loading) return <Skeleton className={cn("h-4 w-64 max-w-full", className)} />;
  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;

  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      {visible.map((item, i) => {
        const tone = item.tone ?? "default";
        const content = (
          <>
            {item.icon && <span className="flex [&_svg]:h-3 [&_svg]:w-3">{item.icon}</span>}
            {item.value !== undefined && (
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  tone === "default" && "text-foreground",
                )}
              >
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>
            )}
            {item.label}
          </>
        );
        return (
          <Fragment key={i}>
            {i > 0 && (
              <span aria-hidden="true" className="text-muted-foreground/50">
                ·
              </span>
            )}
            {item.onClick ? (
              <button
                type="button"
                onClick={item.onClick}
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  TONE[tone],
                )}
              >
                {content}
              </button>
            ) : (
              <span className={cn("inline-flex items-center gap-1", TONE[tone])}>{content}</span>
            )}
          </Fragment>
        );
      })}
    </p>
  );
}
