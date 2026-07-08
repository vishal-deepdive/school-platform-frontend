import { CalendarRange } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { shortDate } from "@/features/dashboard/lib/chartTheme";
import { cn } from "@/shared/lib/utils";
import type { AnalyticsTrendPoint } from "@/features/attendance/types";

/** Traffic-light color for a day's attendance %, gray when nothing was marked. */
function tileColor(marked: number, pct: number): string {
  if (marked <= 0) return "oklch(var(--muted))";
  if (pct >= 90) return "#10b981"; // emerald-500
  if (pct >= 75) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

interface AttendanceHeatmapProps {
  points: AnalyticsTrendPoint[] | undefined;
  loading?: boolean;
  className?: string;
}

const LEGEND = [
  { label: "≥90%", color: "#10b981" },
  { label: "75–89%", color: "#f59e0b" },
  { label: "<75%", color: "#ef4444" },
  { label: "Not marked", color: "oklch(var(--muted))" },
];

/**
 * Calendar-style heatmap of daily attendance %, one tile per school day in the
 * selected trend window. Complements the trend line by making individual weak
 * days pop out at a glance. Grows with the trend range selector.
 */
export function AttendanceHeatmap({ points, loading, className }: AttendanceHeatmapProps) {
  const days = points ?? [];

  return (
    <Card padding="md" className={cn("flex flex-col", className)}>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Daily attendance heatmap</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          One tile per school day in the selected range — color shows the % present
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-28 w-full" />
      ) : days.length === 0 ? (
        <div className="flex h-28 flex-col items-center justify-center gap-2 text-center">
          <CalendarRange className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No attendance in this range yet.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => (
              <div
                key={d.date}
                title={`${shortDate(d.date)} — ${
                  d.total_marked > 0 ? `${Math.round(d.percentage)}% present` : "not marked"
                }`}
                className="h-6 w-6 rounded-[5px] transition-transform hover:scale-125"
                style={{ backgroundColor: tileColor(d.total_marked, d.percentage) }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {LEGEND.map((m) => (
              <span
                key={m.label}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                {m.label}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
