import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BookAudio,
  Clock,
  Layers,
  Loader2,
  Mic2,
} from "lucide-react";
import { recordingApi } from "@/features/recording/api/recording";
import type {
  RecordingAnalyticsScope,
  RecordingTrendPoint,
} from "@/features/recording/types";
import { Card, StatCard } from "@/shared/components/ui/Card";
import { ChartSkeleton, StatCardSkeleton } from "@/shared/components/ui/Skeleton";
import { Badge } from "@/shared/components/ui/Badge";
import { BarList } from "@/features/dashboard/components/BarList";
import { shortDate } from "@/features/dashboard/lib/chartTheme";

const SCOPE_COPY: Record<RecordingAnalyticsScope, { title: string; subtitle: string }> = {
  own: {
    title: "Your recordings",
    subtitle: "Lectures you've uploaded and turned into study material",
  },
  class: {
    title: "Class recordings",
    subtitle: "Lecture notes and summaries available to your class",
  },
  school: {
    title: "Recording activity",
    subtitle: "Lecture recordings across your school",
  },
  platform: {
    title: "Recording activity",
    subtitle: "Lecture recordings across all schools",
  },
};

function fmtMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RecordingTrendPoint & { label: string } }>;
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">{p.label}</p>
      <p className="mt-1 text-popover-foreground">
        <span className="font-semibold">{p.count}</span>{" "}
        {p.count === 1 ? "recording" : "recordings"}
      </p>
    </div>
  );
}

/**
 * Recording-activity analytics, rendered from GET /recording/analytics. The
 * copy adapts to the scope the backend resolved for the caller's role (a
 * teacher's own uploads, a class's available recordings, or a whole
 * school/platform). Self-hides on an access error.
 */
export function RecordingAnalyticsSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["recording", "analytics"],
    queryFn: () => recordingApi.getAnalytics({ days: 30 }),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const trend = useMemo(
    () => (data?.trend ?? []).map((p) => ({ ...p, label: shortDate(p.date) })),
    [data],
  );
  const isStaffScope = data?.scope === "school" || data?.scope === "platform";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // Access denied (e.g. a student whose class isn't linked) — hide silently.
  if (isError || !data) return null;

  const t = data.totals;
  const copy = SCOPE_COPY[data.scope];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">{copy.title}</h3>
            <p className="text-xs text-muted-foreground">{copy.subtitle}</p>
          </div>
        </div>
        <Link
          to="/recording/list"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Browse <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Recordings"
          value={t.recordings}
          icon={<Mic2 className="h-5 w-5" />}
          color="primary"
          description={
            isStaffScope
              ? `across ${t.classes} ${t.classes === 1 ? "class" : "classes"}`
              : "available to you"
          }
        />
        <StatCard
          label="Content length"
          value={fmtMinutes(t.total_minutes)}
          icon={<Clock className="h-5 w-5" />}
          color="info"
          description={t.avg_minutes > 0 ? `~${t.avg_minutes}m each` : undefined}
        />
        <StatCard
          label="Subjects covered"
          value={t.subjects}
          icon={<Layers className="h-5 w-5" />}
          color="success"
        />
        {isStaffScope ? (
          <StatCard
            label="Being processed"
            value={t.processing}
            icon={<Loader2 className="h-5 w-5" />}
            color="warning"
            description={`${t.processed} ready`}
          />
        ) : (
          <StatCard
            label="Ready to study"
            value={t.processed}
            icon={<BookAudio className="h-5 w-5" />}
            color="success"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card padding="md" className="lg:col-span-2">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Recordings over time</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">New recordings per day, last 30 days</p>
          </div>
          {trend.length === 0 ? (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
              No recordings in the last 30 days.
            </div>
          ) : (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="recording-fill" x1="0" y1="0" x2="0" y2="1">
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
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    content={<TrendTooltip />}
                    cursor={{ stroke: "oklch(var(--muted-foreground))", strokeDasharray: "3 3" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Recordings"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#recording-fill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "oklch(var(--card))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card padding="md">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">By subject</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Recordings per subject</p>
          </div>
          <BarList
            items={data.by_subject.map((s) => ({
              label: s.subject,
              value: s.count,
              hint: s.minutes ? `· ${fmtMinutes(s.minutes)}` : undefined,
            }))}
            emptyLabel="No subjects yet."
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {data.by_teacher.length > 0 && (
          <Card padding="md">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground">Top contributors</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">Teachers creating the most content</p>
            </div>
            <BarList
              items={data.by_teacher.map((tt) => ({ label: tt.teacher, value: tt.count }))}
            />
          </Card>
        )}

        <Card
          padding="md"
          className={data.by_teacher.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}
        >
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Latest recordings</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Most recently uploaded</p>
          </div>
          {data.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No recordings yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[r.class_name, r.subject].filter(Boolean).join(" · ") || "—"}
                      {r.date ? ` · ${shortDate(r.date)}` : ""}
                    </p>
                  </div>
                  <Badge variant={r.processed ? "success" : "warning"}>
                    {r.processed ? "Ready" : "Processing"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
