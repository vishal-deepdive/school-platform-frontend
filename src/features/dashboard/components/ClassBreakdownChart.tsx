import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn } from "@/shared/lib/utils";
import type { ClassBreakdownItem } from "@/features/attendance/types";

function classLabel(c: ClassBreakdownItem): string {
  if (!c.class_name) return "—";
  return c.section ? `${c.class_name} ${c.section}` : c.class_name;
}

interface BreakdownTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ClassBreakdownItem & { label: string };
  }>;
}

function BreakdownTooltip({ active, payload }: BreakdownTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">{p.label}</p>
      <p className="mt-1 text-popover-foreground">
        Today:{" "}
        <span className="font-semibold">
          {p.today_percentage != null ? `${p.today_percentage}%` : "not marked"}
        </span>
        {p.marked_today > 0 && (
          <span className="text-muted-foreground">
            {" "}
            ({p.present_today}/{p.marked_today})
          </span>
        )}
      </p>
      <p className="mt-0.5 text-popover-foreground">
        Last 7 days:{" "}
        <span className="font-semibold">
          {p.window_percentage != null ? `${p.window_percentage}%` : "—"}
        </span>
      </p>
      <p className="mt-0.5 text-muted-foreground">{p.enrolled} enrolled</p>
    </div>
  );
}

interface ClassBreakdownChartProps {
  items: ClassBreakdownItem[] | undefined;
  loading?: boolean;
  className?: string;
}

/**
 * Class-by-class comparison: today's attendance % next to the 7-day average,
 * so under-performing classes stand out at a glance.
 */
export function ClassBreakdownChart({
  items,
  loading,
  className,
}: ClassBreakdownChartProps) {
  const data = useMemo(
    () => (items ?? []).map((c) => ({ ...c, label: classLabel(c) })),
    [items],
  );

  return (
    <Card padding="md" className={cn("flex flex-col", className)}>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">
          Attendance by class
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Today&apos;s share of students present vs the last-7-day average
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : data.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No classes with enrolled students yet.
          </p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
              barGap={2}
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
                interval={0}
                angle={data.length > 8 ? -35 : 0}
                textAnchor={data.length > 8 ? "end" : "middle"}
                height={data.length > 8 ? 52 : 24}
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
                content={<BreakdownTooltip />}
                cursor={{ fill: "oklch(var(--muted-foreground))", opacity: 0.08 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar
                dataKey="today_percentage"
                name="Today"
                fill="oklch(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="window_percentage"
                name="7-day avg"
                fill="#94a3b8"
                fillOpacity={0.55}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
