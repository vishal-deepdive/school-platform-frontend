import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn } from "@/shared/lib/utils";
import type { AnalyticsTrendPoint } from "@/features/attendance/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeekdayPoint {
  day: string;
  percentage: number | null;
  present: number;
  total: number;
  daysCounted: number;
}

/** Average present-% per weekday across the trend window (Sundays excluded —
 * schools here don't run on Sundays, and holidays never appear in the data). */
function buildWeekdayPattern(points: AnalyticsTrendPoint[]): WeekdayPoint[] {
  const acc = new Map<number, { present: number; total: number; days: number }>();
  for (const p of points) {
    const [d, m, y] = p.date.split("-").map((v) => parseInt(v, 10));
    const dow = new Date(y, m - 1, d).getDay(); // 0=Sun … 6=Sat
    if (dow === 0) continue;
    const slot = acc.get(dow) ?? { present: 0, total: 0, days: 0 };
    slot.present += p.present;
    slot.total += p.total_marked;
    slot.days += 1;
    acc.set(dow, slot);
  }
  return WEEKDAYS.map((label, i) => {
    const slot = acc.get(i + 1);
    return {
      day: label,
      percentage:
        slot && slot.total > 0
          ? Math.round((slot.present / slot.total) * 1000) / 10
          : null,
      present: slot?.present ?? 0,
      total: slot?.total ?? 0,
      daysCounted: slot?.days ?? 0,
    };
  });
}

function barColor(pct: number | null): string {
  if (pct == null) return "#94a3b8";
  if (pct >= 90) return "#10b981";
  if (pct >= 75) return "#f59e0b";
  return "#ef4444";
}

interface WeekdayTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WeekdayPoint }>;
}

function WeekdayTooltip({ active, payload }: WeekdayTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">{p.day}</p>
      {p.percentage == null ? (
        <p className="mt-1 text-muted-foreground">No marks on this weekday yet</p>
      ) : (
        <>
          <p className="mt-1 text-popover-foreground">
            <span className="font-semibold">{p.percentage}%</span> present on average
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {p.present} of {p.total} marks · {p.daysCounted}{" "}
            {p.daysCounted === 1 ? "day" : "days"}
          </p>
        </>
      )}
    </div>
  );
}

interface WeekdayPatternChartProps {
  points: AnalyticsTrendPoint[] | undefined;
  loading?: boolean;
  className?: string;
}

/**
 * Average attendance by day of the week — makes recurring dips (e.g. Mondays
 * after a holiday, Saturdays) jump out. Bars are traffic-light colored.
 */
export function WeekdayPatternChart({
  points,
  loading,
  className,
}: WeekdayPatternChartProps) {
  const data = useMemo(() => buildWeekdayPattern(points ?? []), [points]);
  const hasData = data.some((d) => d.percentage != null);

  return (
    <Card padding="md" className={cn("flex flex-col", className)}>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">
          Weekday pattern
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Average attendance by day of the week
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : !hasData ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
          <CalendarRange className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Mark a few more days to reveal the weekly rhythm.
          </p>
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="oklch(var(--border))"
                opacity={0.6}
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
              />
              <Tooltip
                content={<WeekdayTooltip />}
                cursor={{ fill: "oklch(var(--muted-foreground))", opacity: 0.08 }}
              />
              <Bar dataKey="percentage" name="Attendance" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {data.map((d) => (
                  <Cell key={d.day} fill={barColor(d.percentage)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
