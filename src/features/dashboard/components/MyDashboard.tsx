import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  GraduationCap,
  UserCheck,
  UserX,
} from "lucide-react";
import { attendanceApi } from "@/features/attendance/api/attendance";
import type {
  MyMonthlyStat,
  MyStudentBlock,
} from "@/features/attendance/types";
import { Card, StatCard } from "@/shared/components/ui/Card";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { StatCardSkeleton, ChartSkeleton } from "@/shared/components/ui/Skeleton";
import { StatusDonut } from "@/features/dashboard/components/StatusDonut";
import { SegmentedControl } from "@/features/dashboard/components/SegmentedControl";
import { STATUS_META, shortDate } from "@/features/dashboard/lib/chartTheme";

const LEAVE_BADGES: Record<string, BadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "default",
};

/** Consecutive attended days (P/L, half-days break it) counting back from the
 * most recent mark. */
function currentStreak(block: MyStudentBlock): number {
  let streak = 0;
  for (let i = block.day_statuses.length - 1; i >= 0; i--) {
    const s = block.day_statuses[i].status;
    if (s === "P" || s === "L") streak += 1;
    else if (s === "E") continue; // excused days don't break a streak
    else break;
  }
  return streak;
}

interface MonthlyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MyMonthlyStat }>;
}

function MonthlyTooltip({ active, payload }: MonthlyTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">{p.label}</p>
      <p className="mt-1 text-popover-foreground">
        <span className="font-semibold">
          {p.percentage != null ? `${p.percentage}%` : "—"}
        </span>{" "}
        attendance
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {p.present} present · {p.absent} absent · {p.working_days} working days
      </p>
    </div>
  );
}

/** Bar chart of attendance % per calendar month (last ~6 months). */
function MonthlyChart({ monthly }: { monthly: MyMonthlyStat[] }) {
  if (monthly.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No attendance history yet.
      </div>
    );
  }
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
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
            content={<MonthlyTooltip />}
            cursor={{ fill: "oklch(var(--muted-foreground))", opacity: 0.08 }}
          />
          <Bar
            dataKey="percentage"
            name="Attendance"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** GitHub-style strip of the last N marked days, colored by status. */
function DayStatusStrip({ block }: { block: MyStudentBlock }) {
  const days = block.day_statuses;
  if (days.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No days marked in this window yet.
      </p>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {days.map((d) => {
          const meta = STATUS_META[d.status];
          return (
            <div
              key={d.date}
              title={`${shortDate(d.date)} — ${meta?.label ?? d.status}`}
              className="h-5 w-5 rounded-[5px] transition-transform hover:scale-125"
              style={{ backgroundColor: meta?.color ?? "#94a3b8" }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
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
    </div>
  );
}

/** One student's full analytics block (students see one; parents one per child). */
function StudentBlock({
  block,
  days,
  showName,
}: {
  block: MyStudentBlock;
  days: number;
  showName: boolean;
}) {
  const s = block.summary;

  return (
    <div className="space-y-4">
      {showName && (
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            {block.student_name || block.roll_no}
          </h2>
          <span className="text-xs text-muted-foreground">
            {block.class_name
              ? `Class ${block.class_name}${block.section ? ` ${block.section}` : ""} · `
              : ""}
            Roll no {block.roll_no}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Attendance (${days}d)`}
          value={s.percentage != null ? `${s.percentage}%` : "—"}
          icon={<UserCheck className="h-5 w-5" />}
          color={
            s.percentage == null
              ? "primary"
              : s.percentage >= 90
                ? "success"
                : s.percentage >= 75
                  ? "warning"
                  : "danger"
          }
          description={
            s.working_days > 0
              ? `${s.attended_days} of ${s.working_days} working days`
              : "no days marked yet"
          }
        />
        <StatCard
          label="Days Present"
          value={s.present}
          icon={<CalendarDays className="h-5 w-5" />}
          color="success"
          description={
            currentStreak(block) >= 2
              ? `🔥 ${currentStreak(block)}-day streak${s.late > 0 ? ` · ${s.late} late` : ""}`
              : s.late > 0
                ? `plus ${s.late} late arrivals`
                : undefined
          }
        />
        <StatCard
          label="Days Absent"
          value={s.absent}
          icon={<UserX className="h-5 w-5" />}
          color="danger"
          description={s.excused > 0 ? `plus ${s.excused} excused` : undefined}
        />
        <StatCard
          label="Pending Leaves"
          value={block.leaves.pending}
          icon={<CalendarClock className="h-5 w-5" />}
          color="warning"
          description={`${block.leaves.approved} approved this session`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatusDonut
          counts={s}
          title="My attendance mix"
          subtitle={`Statuses over the last ${days} days`}
          centerLabel={s.percentage != null ? `${s.percentage}%` : "—"}
          centerSub="attendance"
        />

        <Card padding="md" className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">
              Monthly attendance
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Attendance percentage per month
            </p>
          </div>
          <MonthlyChart monthly={block.monthly} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card padding="md" className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">
              Last {days} days
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              One tile per marked school day — hover to see the date
            </p>
          </div>
          <DayStatusStrip block={block} />
        </Card>

        <Card padding="md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Leave requests
            </h2>
            <Link
              to="/attendance/leave"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Apply <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {block.leaves.recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarX2 className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No leave requests yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {block.leaves.recent.slice(0, 4).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {l.start_date === l.end_date
                        ? shortDate(l.start_date)
                        : `${shortDate(l.start_date)} – ${shortDate(l.end_date)}`}
                    </p>
                    {l.reason && (
                      <p className="truncate text-xs text-muted-foreground">
                        {l.reason}
                      </p>
                    )}
                  </div>
                  <Badge variant={LEAVE_BADGES[l.status] ?? "default"}>
                    {l.status}
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

/**
 * Personal analytics dashboard for students (own record) and parents (one
 * block per approved linked child). Fetches /attendance/my-analytics/.
 */
export function MyDashboard({ isParent }: { isParent: boolean }) {
  const [windowDays, setWindowDays] = useState(30);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["attendance", "my-analytics", windowDays],
    queryFn: () => attendanceApi.getMyAnalytics({ days: String(windowDays) }),
    staleTime: 5 * 60_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });

  const days = data?.days ?? windowDays;
  const blocks = useMemo(() => data?.students ?? [], [data]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartSkeleton />
          <ChartSkeleton className="lg:col-span-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // Roll number not linked / no approved child yet — the API answers 403.
  if (isError || blocks.length === 0) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">
            {isParent
              ? "No approved child is linked to your account yet"
              : "Your attendance profile isn't linked yet"}
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            {isParent
              ? "Once the school approves your parent account and links your child, their attendance analytics appear here."
              : "Once your teacher links your roll number to your account, your attendance analytics appear here."}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="animate-slide-up space-y-8">
      <div className="flex items-center justify-end">
        <SegmentedControl
          aria-label="Summary window"
          options={[
            { value: 30, label: "30d" },
            { value: 60, label: "60d" },
            { value: 90, label: "90d" },
          ]}
          value={windowDays}
          onChange={setWindowDays}
        />
      </div>
      {blocks.map((b) => (
        <StudentBlock
          key={b.roll_no}
          block={b}
          days={days}
          showName={isParent || blocks.length > 1}
        />
      ))}
    </div>
  );
}
