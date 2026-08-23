import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn } from "@/shared/lib/utils";
import { STATUS_META, STATUS_ORDER } from "@/features/dashboard/lib/chartTheme";

interface StatusCounts {
  present: number;
  absent: number;
  late: number;
  excused: number;
  half_day: number;
}

const COUNT_KEYS: Record<(typeof STATUS_ORDER)[number], keyof StatusCounts> = {
  P: "present",
  A: "absent",
  L: "late",
  E: "excused",
  H: "half_day",
};

interface DonutTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number; color: string } }>;
}

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">
        {p.name}: {p.value}
      </p>
    </div>
  );
}

interface ActiveSliceProps {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
}

/** The hovered arc grows outward and gains a surface ring, so the slice under
 * the cursor reads as "picked up" off the ring. */
function ActiveSlice({
  cx = 0,
  cy = 0,
  innerRadius = 0,
  outerRadius = 0,
  startAngle = 0,
  endAngle = 0,
  fill,
}: ActiveSliceProps) {
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 5}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="oklch(var(--card))"
      strokeWidth={2}
    />
  );
}

interface StatusDonutProps {
  counts: StatusCounts | undefined;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  /** Big number shown in the middle of the ring, e.g. "92%". */
  centerLabel?: string;
  centerSub?: string;
  className?: string;
}

/**
 * Donut chart of attendance-status distribution (Present / Absent / Late /
 * Excused / Half day) with a legend and an optional center metric.
 */
export function StatusDonut({
  counts,
  loading,
  title = "Status distribution",
  subtitle,
  centerLabel,
  centerSub,
  className,
}: StatusDonutProps) {
  const data = useMemo(
    () =>
      STATUS_ORDER.map((s) => ({
        name: STATUS_META[s].label,
        value: counts ? counts[COUNT_KEYS[s]] : 0,
        color: STATUS_META[s].color,
      })).filter((d) => d.value > 0),
    [counts],
  );
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <Card padding="md" className={cn("flex flex-col", className)}>
      <div className="mb-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-52 w-full" />
      ) : total === 0 ? (
        <div className="flex h-52 flex-col items-center justify-center gap-2 text-center">
          <PieIcon className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No attendance records in this window yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <div
            className="relative h-44 w-full"
            role="img"
            aria-label={`Attendance status breakdown: ${data.map((d) => `${d.value} ${d.name.toLowerCase()}`).join(", ")} — ${total} marked in total.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<DonutTooltip />} />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="68%"
                  outerRadius="95%"
                  paddingAngle={2}
                  strokeWidth={0}
                  animationDuration={250}
                  animationEasing="ease-out"
                  activeShape={ActiveSlice}
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((d, i) => (
                    <Cell
                      key={d.name}
                      fill={d.color}
                      fillOpacity={
                        activeIndex == null || activeIndex === i ? 1 : 0.4
                      }
                      className="transition-opacity duration-200"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {(centerLabel || activeIndex != null) && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                {activeIndex != null && data[activeIndex] ? (
                  <>
                    <p
                      className="text-3xl font-extrabold tracking-tight tabular-nums"
                      style={{ color: data[activeIndex].color }}
                    >
                      {data[activeIndex].value}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {data[activeIndex].name}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-extrabold tracking-tight text-foreground">
                      {centerLabel}
                    </p>
                    {centerSub && (
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {centerSub}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {data.map((d, i) => (
              <button
                key={d.name}
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-1 text-xs text-muted-foreground transition-opacity",
                  activeIndex != null && activeIndex !== i && "opacity-40",
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                {d.name}
                <span className="font-semibold text-foreground">{d.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
