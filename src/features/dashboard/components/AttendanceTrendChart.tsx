import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn } from "@/shared/lib/utils";
import type { AnalyticsTrendPoint } from "@/features/attendance/types";
import { SegmentedControl } from "@/features/dashboard/components/SegmentedControl";
import { STATUS_META, shortDate } from "@/features/dashboard/lib/chartTheme";

type TrendMode = "percentage" | "composition";

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AnalyticsTrendPoint & { label: string } }>;
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">{p.label}</p>
      <p className="mt-1 text-popover-foreground">
        <span className="font-semibold">{p.percentage}%</span> present
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {p.present} present · {p.absent} absent
        {p.late > 0 && ` · ${p.late} late`}
        {p.excused > 0 && ` · ${p.excused} excused`}
        {p.half_day > 0 && ` · ${p.half_day} half day`} · {p.total_marked} marked
      </p>
    </div>
  );
}

interface AttendanceTrendChartProps {
  points: AnalyticsTrendPoint[] | undefined;
  loading?: boolean;
  className?: string;
  subtitle?: string;
  /** Trend window in days; renders the range selector when onRangeChange is set. */
  rangeDays?: number;
  onRangeChange?: (days: number) => void;
}

const RANGE_OPTIONS = [
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

/**
 * Daily attendance trend with two interactive views: a single-series "% present"
 * area chart, and a stacked "composition" bar chart splitting each day into
 * Present / Absent / Late / Excused / Half-day counts. Days without marks
 * (holidays, weekends) are omitted by the API rather than plotted as zero.
 */
export function AttendanceTrendChart({
  points,
  loading,
  className,
  subtitle,
  rangeDays,
  onRangeChange,
}: AttendanceTrendChartProps) {
  const [mode, setMode] = useState<TrendMode>("percentage");
  const data = useMemo(
    () => (points ?? []).map((p) => ({ ...p, label: shortDate(p.date) })),
    [points],
  );

  return (
    <Card padding="md" className={cn("flex flex-col", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Attendance trend
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {subtitle ?? "Share of students marked present each school day"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label="Chart view"
            options={[
              { value: "percentage" as const, label: "Present %" },
              { value: "composition" as const, label: "Composition" },
            ]}
            value={mode}
            onChange={setMode}
          />
          {onRangeChange && rangeDays != null && (
            <SegmentedControl
              aria-label="Trend window"
              options={RANGE_OPTIONS}
              value={rangeDays}
              onChange={onRangeChange}
            />
          )}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : data.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No attendance marked yet — once you mark your first day, the trend
            appears here.
          </p>
        </div>
      ) : (
        <div
          className="h-56 w-full"
          role="img"
          aria-label={`Attendance trend over ${data.length} school days, from ${data[0].label} to ${data[data.length - 1].label}. Latest: ${data[data.length - 1].percentage}% present.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            {mode === "percentage" ? (
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
              >
                <defs>
                  <linearGradient id="attendance-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="oklch(var(--border))"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
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
                  content={<TrendTooltip />}
                  cursor={{ stroke: "oklch(var(--muted-foreground))", strokeDasharray: "3 3" }}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  name="Present"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#attendance-fill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "oklch(var(--card))" }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="oklch(var(--border))"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
                />
                <Tooltip
                  content={<TrendTooltip />}
                  cursor={{ fill: "oklch(var(--muted-foreground))", opacity: 0.08 }}
                />
                <Bar dataKey="present" name="Present" stackId="day" fill={STATUS_META.P.color} maxBarSize={26} />
                <Bar dataKey="late" name="Late" stackId="day" fill={STATUS_META.L.color} maxBarSize={26} />
                <Bar dataKey="half_day" name="Half day" stackId="day" fill={STATUS_META.H.color} maxBarSize={26} />
                <Bar dataKey="excused" name="Excused" stackId="day" fill={STATUS_META.E.color} maxBarSize={26} />
                <Bar
                  dataKey="absent"
                  name="Absent"
                  stackId="day"
                  fill={STATUS_META.A.color}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={26}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {mode === "composition" && data.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {Object.values(STATUS_META).map((m) => (
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
      )}
    </Card>
  );
}
