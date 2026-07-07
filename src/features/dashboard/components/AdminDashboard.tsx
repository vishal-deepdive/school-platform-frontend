import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Building2,
  ClipboardCheck,
  Mic2,
  TrendingUp,
  Users,
} from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import type { PlatformTrendPoint } from "@/features/admin/types";
import { Card, CardHeader, StatCard } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { StatCardSkeleton, ChartSkeleton } from "@/shared/components/ui/Skeleton";
import { SegmentedControl } from "@/features/dashboard/components/SegmentedControl";
import { shortDate } from "@/features/dashboard/lib/chartTheme";

const ROLE_COLORS: Record<string, string> = {
  admin: "#6366f1", // indigo-500
  principal: "#a855f7", // purple-500
  teacher: "#3b82f6", // blue-500
  student: "#10b981", // emerald-500
  parent: "#f59e0b", // amber-500
};

const ONBOARDING_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  pending_verification: { label: "Pending verification", variant: "default" },
  email_verified: { label: "Awaiting review", variant: "warning" },
  changes_requested: { label: "Changes requested", variant: "info" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PlatformTrendPoint & { label: string } }>;
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">{p.label}</p>
      <p className="mt-1 text-popover-foreground">
        <span className="font-semibold">{p.total_marked}</span> records marked
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {p.present} present · {p.percentage}% attendance
      </p>
    </div>
  );
}

interface RoleTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; count: number } }>;
}

function RoleTooltip({ active, payload }: RoleTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold capitalize text-popover-foreground">
        {p.name}: {p.count}
      </p>
    </div>
  );
}

/**
 * Platform-wide admin dashboard: cross-school totals, activity trend,
 * user-base composition, top schools, and the onboarding pipeline.
 */
export function AdminDashboard() {
  const [trendMetric, setTrendMetric] = useState<"total_marked" | "percentage">(
    "total_marked",
  );
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "platform-overview"],
    queryFn: () => adminApi.getPlatformOverview(),
    staleTime: 5 * 60_000,
  });

  const trend = useMemo(
    () =>
      (data?.attendance_trend ?? []).map((p) => ({
        ...p,
        label: shortDate(p.date),
      })),
    [data],
  );

  const roles = useMemo(
    () =>
      (data?.users_by_role ?? []).map((r) => ({
        name: r.role,
        count: r.count,
        color: ROLE_COLORS[r.role] ?? "#94a3b8",
      })),
    [data],
  );

  const pendingReview =
    data?.onboarding_by_status.find((s) => s.status === "email_verified")
      ?.count ?? 0;

  const maxSchool = Math.max(1, ...(data?.top_schools ?? []).map((s) => s.students));

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Schools"
          value={data?.schools_active ?? "—"}
          icon={<Building2 className="h-5 w-5" />}
          color="primary"
          description={
            pendingReview > 0
              ? `${pendingReview} application${pendingReview === 1 ? "" : "s"} awaiting review`
              : "onboarding queue clear"
          }
        />
        <StatCard
          label="Students Enrolled"
          value={data?.students_enrolled ?? "—"}
          icon={<Users className="h-5 w-5" />}
          color="success"
          description={`${data?.users_total ?? 0} platform users · +${data?.new_users_30d ?? 0} in 30d`}
        />
        <StatCard
          label="Recordings Processed"
          value={data?.recordings_total ?? "—"}
          icon={<Mic2 className="h-5 w-5" />}
          color="warning"
          description={`${data?.recordings_30d ?? 0} in the last 30 days`}
        />
        <StatCard
          label="Attendance Records"
          value={data?.attendance_records_total ?? "—"}
          icon={<Activity className="h-5 w-5" />}
          color="info"
          description={`${data?.rag_documents_total ?? 0} textbooks indexed for Q&A`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card padding="md" className="lg:col-span-2">
          <CardHeader
            title="Platform attendance activity"
            description="Across all schools, last 14 days"
            className="mb-4"
            action={
              <SegmentedControl
                aria-label="Trend metric"
                options={[
                  { value: "total_marked" as const, label: "Records" },
                  { value: "percentage" as const, label: "Attendance %" },
                ]}
                value={trendMetric}
                onChange={setTrendMetric}
              />
            }
          />
          {trend.length === 0 ? (
            <EmptyState
              variant="plain"
              className="h-56 py-0"
              icon={<TrendingUp className="h-8 w-8" />}
              title="No attendance activity"
              description="Nothing has been marked in the last 14 days."
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="platform-fill" x1="0" y1="0" x2="0" y2="1">
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
                    domain={trendMetric === "percentage" ? [0, 100] : undefined}
                    ticks={trendMetric === "percentage" ? [0, 25, 50, 75, 100] : undefined}
                    tickFormatter={
                      trendMetric === "percentage"
                        ? (v: number) => `${v}%`
                        : undefined
                    }
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
                    dataKey={trendMetric}
                    name={trendMetric === "percentage" ? "Attendance %" : "Marked"}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#platform-fill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "oklch(var(--card))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card padding="md">
          <CardHeader
            title="Users by role"
            description="Active accounts across the platform"
            className="mb-4"
          />
          {roles.length === 0 ? (
            <EmptyState
              variant="plain"
              className="h-56 py-0"
              icon={<Users className="h-8 w-8" />}
              title="No users yet"
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roles}
                  layout="vertical"
                  margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="3 3"
                    stroke="oklch(var(--border))"
                    opacity={0.6}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={70}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    content={<RoleTooltip />}
                    cursor={{ fill: "oklch(var(--muted-foreground))", opacity: 0.08 }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {roles.map((r) => (
                      <Cell key={r.name} fill={r.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding="md">
          <CardHeader
            title="Largest schools"
            description="By enrolled students"
            className="mb-4"
            action={
              <Link
                to="/attendance/stats"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {(data?.top_schools ?? []).length === 0 ? (
            <EmptyState
              variant="plain"
              className="py-8"
              icon={<BookOpen className="h-8 w-8" />}
              title="No students enrolled yet"
            />
          ) : (
            <ul className="space-y-3">
              {data!.top_schools.map((s) => (
                <li key={s.school_name}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-foreground">
                      {s.school_name}
                    </p>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {s.students}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${Math.round((s.students / maxSchool) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <CardHeader
            title="Onboarding pipeline"
            description="School applications by status"
            className="mb-4"
            action={
              <Link
                to="/admin/onboarding"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Review <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {(data?.onboarding_by_status ?? []).length === 0 ? (
            <EmptyState
              variant="plain"
              className="py-8"
              icon={<ClipboardCheck className="h-8 w-8" />}
              title="No onboarding applications yet"
            />
          ) : (
            <ul className="divide-y divide-border">
              {data!.onboarding_by_status.map((s) => {
                const meta = ONBOARDING_LABELS[s.status] ?? {
                  label: s.status,
                  variant: "default" as BadgeVariant,
                };
                return (
                  <li
                    key={s.status}
                    className="flex items-center justify-between py-2.5"
                  >
                    <p className="text-sm text-foreground">{meta.label}</p>
                    <Badge variant={meta.variant}>{s.count}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
