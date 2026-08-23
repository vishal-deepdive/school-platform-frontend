import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Sun,
  TrendingDown,
} from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn } from "@/shared/lib/utils";
import type { AnalyticsResponse } from "@/features/attendance/types";

function classLabel(cls: string | null, sec: string | null): string {
  if (!cls) return "—";
  return sec ? `${cls} ${sec}` : cls;
}

function SectionLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
    >
      {children} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

interface NeedsAttentionProps {
  analytics: AnalyticsResponse | undefined;
  loading?: boolean;
  className?: string;
  /** Lay the three sections out side by side (for a full-width row). */
  wide?: boolean;
}

/**
 * Operational to-do list for staff: classes not marked today, pending leave
 * requests, and students trending toward low attendance — each with a direct
 * link to the page where it gets fixed.
 */
export function NeedsAttention({ analytics, loading, className, wide }: NeedsAttentionProps) {
  const unmarked = analytics?.unmarked_classes ?? [];
  const pendingTotal = analytics?.pending_leaves_total ?? 0;
  const pending = analytics?.pending_leaves ?? [];
  const lowAttendance = analytics?.low_attendance ?? [];
  const isHoliday = analytics?.is_holiday_today ?? false;

  const allClear =
    !loading && unmarked.length === 0 && pendingTotal === 0 && lowAttendance.length === 0;

  return (
    <Card padding="md" className={cn("flex flex-col", className)}>
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-base font-semibold text-foreground">Needs attention</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : allClear ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          {isHoliday ? (
            <>
              <Sun className="h-8 w-8 text-amber-500" />
              <p className="text-sm font-medium text-foreground">Today is a holiday</p>
              <p className="text-xs text-muted-foreground">Nothing needs your attention.</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-foreground">All caught up</p>
              <p className="text-xs text-muted-foreground">
                No pending approvals or alerts right now.
              </p>
            </>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col divide-y divide-border",
            wide &&
              "lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0 [&>div]:lg:px-6 [&>div]:lg:py-0 [&>div:first-child]:lg:pl-0 [&>div:last-child]:lg:pr-0",
          )}
        >
          {unmarked.length > 0 && (
            <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="mt-0.5 rounded-lg bg-amber-500/15 p-2 text-amber-700 dark:text-amber-400 border border-amber-500/25 shadow-2xs">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {unmarked.length} {unmarked.length === 1 ? "class" : "classes"} not
                  marked today
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                  {unmarked.slice(0, 4).map((c) => classLabel(c.class_name, c.section)).join(", ")}
                  {unmarked.length > 4 && ` +${unmarked.length - 4} more`}
                </p>
                <div className="mt-1.5">
                  <SectionLink to="/attendance/roll-call">Take roll call</SectionLink>
                </div>
              </div>
            </div>
          )}

          {pendingTotal > 0 && (
            <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="mt-0.5 rounded-lg bg-blue-500/15 p-2 text-blue-700 dark:text-blue-400 border border-blue-500/25 shadow-2xs">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {pendingTotal} leave {pendingTotal === 1 ? "request" : "requests"} awaiting
                  review
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                  {pending
                    .slice(0, 3)
                    .map((l) => l.student_name || l.roll_no)
                    .join(", ")}
                </p>
                <div className="mt-1.5">
                  <SectionLink to="/attendance/leave">Review requests</SectionLink>
                </div>
              </div>
            </div>
          )}

          {lowAttendance.length > 0 && (
            <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="mt-0.5 rounded-lg bg-rose-500/15 p-2 text-rose-700 dark:text-rose-400 border border-rose-500/25 shadow-2xs">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Low attendance (last 30 days)
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {lowAttendance.slice(0, 5).map((s) => (
                    <li
                      key={`${s.roll_no}-${s.class_name}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                        {s.student_name || s.roll_no}
                        <span className="text-slate-500 dark:text-slate-400">
                          {" "}
                          · {classLabel(s.class_name, s.section)}
                        </span>
                      </span>
                      <Badge variant="danger">{s.percentage}%</Badge>
                    </li>
                  ))}
                </ul>
                <div className="mt-1.5">
                  <SectionLink to="/attendance/view">View attendance</SectionLink>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
