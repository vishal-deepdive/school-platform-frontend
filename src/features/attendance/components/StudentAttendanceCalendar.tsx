import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter, isValid, parse, startOfMonth } from "date-fns";
import { AlertTriangle, CalendarDays, CalendarRange } from "lucide-react";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { statusCellClass } from "@/features/attendance/lib/status";
import { StatusLegend } from "@/features/attendance/components/StatusLegend";
import { MonthCalendarShell } from "@/features/attendance/components/MonthCalendarShell";
import { StatCard } from "@/shared/components/ui/Card";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Panel } from "@/shared/components/ui/Panel";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import type { MyDayStatus } from "@/features/attendance/types";

interface StudentAttendanceCalendarProps {
  /** Child's roll_no (parent, when they have 2+ children). Omit for a student
   * viewing their own record, or a parent with exactly one child. */
  rollNo?: string | null;
  isParent: boolean;
  studentLabel?: string;
}

function dayCellSkeleton(i: number) {
  return <Skeleton key={i} className="aspect-square rounded-lg" />;
}

/**
 * Month-grid attendance calendar for a student's own record, or a parent's
 * approved child. Replaces the flat "recent days" chip list with a real
 * calendar: each day is colored by status (P/A/L/E/H) and month navigation
 * is capped at the current month.
 */
export function StudentAttendanceCalendar({
  rollNo,
  isParent,
  studentLabel,
}: StudentAttendanceCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const monthKey = format(month, "yyyy-MM");

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["attendance", "calendar", monthKey, rollNo ?? null],
    queryFn: () =>
      attendanceApi.getStudentCalendar({
        month: monthKey,
        ...(rollNo ? { roll_no: rollNo } : {}),
      }),
    enabled: !isParent || !!rollNo,
    staleTime: 60_000,
    // Keep the previous month's grid on screen while the next one loads
    // instead of flashing back to a full skeleton on every navigation.
    placeholderData: (prev) => prev,
  });

  // `placeholderData` keeps the previous month's response around while the
  // next one loads (avoids a full skeleton flash on navigation) — but that
  // response describes a different month, so it must never be paired with
  // the grid for the month the user has already navigated to.
  const isCurrentMonthData = data?.month === monthKey;

  const statusByDate = useMemo(() => {
    const map = new Map<string, MyDayStatus["status"]>();
    if (!isCurrentMonthData) return map;
    for (const d of data?.day_statuses ?? []) {
      const parsed = parse(d.date, "dd-MM-yyyy", new Date());
      if (isValid(parsed)) map.set(format(parsed, "yyyy-MM-dd"), d.status);
    }
    return map;
  }, [data, isCurrentMonthData]);

  const todayDate = useMemo(() => {
    if (!data?.today) return new Date();
    const parsed = parse(data.today, "dd-MM-yyyy", new Date());
    return isValid(parsed) ? parsed : new Date();
  }, [data?.today]);

  const summary = isCurrentMonthData ? data?.summary : undefined;
  const isBelow75 = summary?.percentage != null && summary.percentage < 75;
  const showingStale = isFetching && !isCurrentMonthData;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Attendance this month"
          value={summary?.percentage != null ? `${summary.percentage.toFixed(0)}%` : "—"}
          icon={<CalendarRange className="h-5 w-5" />}
          color={isBelow75 ? "danger" : "success"}
          description={studentLabel}
        />
        <StatCard label="Days present" value={summary?.present ?? 0} color="success" />
        <StatCard label="Days absent" value={summary?.absent ?? 0} color="danger" />
      </div>

      {isBelow75 && (
        <Alert variant="warning" title="Attendance is below 75% this month">
          <p className="text-sm">
            {isParent
              ? "Your child's attendance this month is below the 75% requirement."
              : "Your attendance this month is below the 75% requirement."}
          </p>
        </Alert>
      )}

      {isError && (
        <Alert variant="error">
          {getErrorMessage(error) || "Failed to load the attendance calendar."}
        </Alert>
      )}

      <Panel
        icon={<CalendarDays className="h-4 w-4" />}
        title="Calendar"
        description={isFetching ? "Updating…" : undefined}
      >
        <MonthCalendarShell
          month={month}
          onMonthChange={setMonth}
          loading={isLoading}
          legend={<StatusLegend className="pt-1" />}
          renderDay={(day, dayNumber) => {
            if (isLoading) return dayCellSkeleton(dayNumber);

            const key = format(day, "yyyy-MM-dd");
            const status = statusByDate.get(key);
            const isFuture = isAfter(day, todayDate);
            const isToday = key === format(todayDate, "yyyy-MM-dd");
            const dayLabel = format(day, "d MMM yyyy");
            const statusLabel = isFuture
              ? "upcoming"
              : status
                ? status
                : "not marked";

            return (
              <div
                role="img"
                aria-label={`${dayLabel}: ${statusLabel}`}
                title={showingStale ? undefined : `${dayLabel} — ${statusLabel}`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs transition-colors",
                  isFuture
                    ? "text-muted-foreground/25"
                    : showingStale
                      ? "bg-muted/30 text-muted-foreground/40"
                      : statusCellClass(status ?? ""),
                  isToday && !showingStale && "ring-2 ring-primary",
                )}
              >
                <span className="text-[0.7rem] font-medium sm:text-sm">{dayNumber}</span>
                {!isFuture && !showingStale && status && (
                  <span className="text-[0.6rem] font-bold sm:text-xs">{status}</span>
                )}
              </div>
            );
          }}
        />

        {!isLoading && isCurrentMonthData && data && data.day_statuses.length === 0 && (
          <EmptyState
            variant="plain"
            className="mt-2"
            icon={<AlertTriangle className="h-8 w-8" />}
            title="No attendance records"
            description={
              isParent
                ? "No attendance has been marked for your child this month yet."
                : "No attendance has been marked for you this month yet."
            }
          />
        )}
      </Panel>
    </div>
  );
}
