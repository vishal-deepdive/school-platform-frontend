import { useMemo } from "react";
import { addMonths, format, getDay, getDaysInMonth, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MonthCalendarShellProps {
  /** Any date within the month currently displayed. */
  month: Date;
  onMonthChange: (next: Date) => void;
  /** Disables the "next month" control once reached (defaults to the real-world current month). */
  maxMonth?: Date;
  legend?: React.ReactNode;
  loading?: boolean;
  className?: string;
  /** Renders the content of one in-month day cell. */
  renderDay: (day: Date, dayNumber: number) => React.ReactNode;
}

/**
 * Month-grid shell shared by the student and class attendance calendars:
 * prev/next navigation (capped at `maxMonth`, defaulting to today), a
 * weekday header, and a 7-column day grid with leading/trailing blanks so
 * every row aligns to its weekday column.
 */
export function MonthCalendarShell({
  month,
  onMonthChange,
  maxMonth,
  legend,
  loading = false,
  className,
  renderDay,
}: MonthCalendarShellProps) {
  const cap = maxMonth ?? new Date();
  const monthStart = startOfMonth(month);
  const atCapMonth = isSameMonth(monthStart, cap);
  const atMaxMonth = atCapMonth || monthStart > cap;

  const daysInMonth = getDaysInMonth(monthStart);
  const leadingBlanks = getDay(monthStart); // 0 = Sunday
  const totalCells = leadingBlanks + daysInMonth;
  const trailingBlanks = (7 - (totalCells % 7)) % 7;

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => onMonthChange(subMonths(monthStart, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-background text-slate-700 dark:text-slate-300 shadow-2xs transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={atMaxMonth}
            onClick={() => onMonthChange(addMonths(monthStart, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-background text-slate-700 dark:text-slate-300 shadow-2xs transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border disabled:hover:bg-background"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
          {format(monthStart, "MMMM yyyy")}
        </h3>

        {atCapMonth ? (
          <div className="w-[4.5rem]" aria-hidden="true" />
        ) : (
          <button
            type="button"
            onClick={() => onMonthChange(new Date())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <RotateCcw className="h-3 w-3" />
            Today
          </button>
        )}
      </div>

      <div className={cn("relative", loading && "pointer-events-none opacity-60")}>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAY_LABELS.map((w) => (
            <div
              key={w}
              className="py-1.5 text-center text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
            >
              {w}
            </div>
          ))}

          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`lead-${i}`} aria-hidden="true" />
          ))}

          {days.map((dayNumber) => {
            const day = new Date(monthStart.getFullYear(), monthStart.getMonth(), dayNumber);
            return <div key={dayNumber}>{renderDay(day, dayNumber)}</div>;
          })}

          {Array.from({ length: trailingBlanks }).map((_, i) => (
            <div key={`trail-${i}`} aria-hidden="true" />
          ))}
        </div>
      </div>

      {legend}
    </div>
  );
}
