import { useMemo } from "react";
import {
  Area,
  AreaChart,
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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "02-07-2026" → "2 Jul" */
function shortDate(ddmmyyyy: string): string {
  const [d, m] = ddmmyyyy.split("-");
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1] ?? ""}`;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AnalyticsTrendPoint & { label: string } }>;
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as AnalyticsTrendPoint & { label: string };
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">{p.label}</p>
      <p className="mt-1 text-popover-foreground">
        <span className="font-semibold">{p.percentage}%</span> present
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {p.present} present · {p.absent} absent · {p.total_marked} marked
      </p>
    </div>
  );
}

interface AttendanceTrendChartProps {
  points: AnalyticsTrendPoint[] | undefined;
  loading?: boolean;
  className?: string;
  subtitle?: string;
}

/**
 * Daily attendance-% trend as a single-series area chart. Days without marks
 * (holidays, weekends) are omitted by the API rather than plotted as zero.
 */
export function AttendanceTrendChart({
  points,
  loading,
  className,
  subtitle,
}: AttendanceTrendChartProps) {
  const data = useMemo(
    () => (points ?? []).map((p) => ({ ...p, label: shortDate(p.date) })),
    [points],
  );

  return (
    <Card padding="md" className={cn("flex flex-col", className)}>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">
          Attendance trend
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {subtitle ?? "Share of students marked present each school day"}
        </p>
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
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
