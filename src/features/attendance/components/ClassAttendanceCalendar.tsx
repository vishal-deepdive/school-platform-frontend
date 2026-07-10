import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter, isValid, parse, startOfMonth } from "date-fns";
import { CalendarDays, Percent, Users } from "lucide-react";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { usePersistedState } from "@/shared/hooks/usePersistedState";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { percentageCellClass } from "@/features/attendance/lib/status";
import {
  AttendanceScopeFilters,
  type ScopeValue,
} from "@/features/attendance/components/AttendanceScopeFilters";
import { MonthCalendarShell } from "@/features/attendance/components/MonthCalendarShell";
import { StatCard } from "@/shared/components/ui/Card";
import { Alert } from "@/shared/components/ui/Alert";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { Panel } from "@/shared/components/ui/Panel";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import type { ClassCalendarDay } from "@/features/attendance/types";

function dayCellSkeleton(i: number) {
  return <Skeleton key={i} className="aspect-square rounded-lg" />;
}

/**
 * Month-grid calendar showing daily class attendance percentage for staff.
 * Each day is a color-graded cell (green ≥75%, amber 60–74%, red <60%,
 * neutral when unmarked/weekend). Scoped to a class/section or the caller's
 * full class scope (teachers without an explicit class see their assigned
 * classes combined).
 */
export function ClassAttendanceCalendar() {
  const { schoolName, ready } = useActiveSchool();
  const [scope, setScope] = usePersistedState<ScopeValue>("att.calendar.scope", {
    className: "",
    section: "",
    subject: "",
  });
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const monthKey = format(month, "yyyy-MM");

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: [
      "attendance",
      "class-calendar",
      schoolName,
      scope.className,
      scope.section,
      monthKey,
    ],
    queryFn: () =>
      attendanceApi.getClassCalendar({
        month: monthKey,
        ...(schoolName ? { school_name: schoolName } : {}),
        ...(scope.className ? { class_name: scope.className } : {}),
        ...(scope.section ? { section: scope.section } : {}),
      }),
    enabled: ready,
    staleTime: 60_000,
    // Keep the previous month's grid on screen while the next one loads
    // instead of flashing back to a full skeleton on every navigation.
    placeholderData: (prev) => prev,
  });

  // `placeholderData` keeps the previous response around while the next
  // month loads — but that response describes a different month, so it must
  // never be paired with the grid for the month the user just navigated to.
  const isCurrentMonthData = data?.month === monthKey;
  const showingStale = isFetching && !isCurrentMonthData;

  const dayByDate = useMemo(() => {
    const map = new Map<string, ClassCalendarDay>();
    if (!isCurrentMonthData) return map;
    for (const d of data?.days ?? []) {
      const parsed = parse(d.date, "dd-MM-yyyy", new Date());
      if (isValid(parsed)) map.set(format(parsed, "yyyy-MM-dd"), d);
    }
    return map;
  }, [data, isCurrentMonthData]);

  const todayDate = useMemo(() => {
    if (!data?.today) return new Date();
    const parsed = parse(data.today, "dd-MM-yyyy", new Date());
    return isValid(parsed) ? parsed : new Date();
  }, [data?.today]);

  const monthPercentage = isCurrentMonthData ? data?.month_percentage : undefined;
  const enrolled = isCurrentMonthData ? data?.enrolled : undefined;
  const markedDays = isCurrentMonthData
    ? (data?.days.filter((d) => d.marked > 0).length ?? 0)
    : 0;

  return (
    <div className="space-y-6">
      <FilterBar title="Scope" icon={<Users className="h-4 w-4" />}>
        <AttendanceScopeFilters value={scope} onChange={setScope} showSubject={false} />
      </FilterBar>

      {isError && (
        <Alert variant="error">
          {getErrorMessage(error) || "Failed to load the class attendance calendar."}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Month attendance"
          value={monthPercentage != null ? `${monthPercentage.toFixed(0)}%` : "—"}
          icon={<Percent className="h-5 w-5" />}
          color={
            monthPercentage == null
              ? "primary"
              : monthPercentage >= 75
                ? "success"
                : monthPercentage >= 60
                  ? "warning"
                  : "danger"
          }
          description={
            scope.className
              ? `Class ${scope.className}${scope.section ? `-${scope.section}` : ""}`
              : "All classes in scope"
          }
        />
        <StatCard label="Enrolled" value={enrolled ?? 0} icon={<Users className="h-5 w-5" />} color="primary" />
        <StatCard label="Days marked" value={markedDays} icon={<CalendarDays className="h-5 w-5" />} color="info" />
      </div>

      <Panel
        icon={<CalendarDays className="h-4 w-4" />}
        title="Daily attendance %"
        description={isFetching ? "Updating…" : undefined}
      >
        <MonthCalendarShell
          month={month}
          onMonthChange={setMonth}
          loading={isLoading}
          legend={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                <span className="text-muted-foreground">≥ 75%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <span className="text-muted-foreground">60–74%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="text-muted-foreground">&lt; 60%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="text-muted-foreground">Not marked</span>
              </span>
            </div>
          }
          renderDay={(day, dayNumber) => {
            if (isLoading) return dayCellSkeleton(dayNumber);

            const key = format(day, "yyyy-MM-dd");
            const cell = dayByDate.get(key);
            const isFuture = isAfter(day, todayDate);
            const isToday = key === format(todayDate, "yyyy-MM-dd");
            const dayLabel = format(day, "d MMM yyyy");
            const statusLabel = isFuture
              ? "upcoming"
              : cell && cell.percentage != null
                ? `${cell.percentage}% present (${cell.present}/${cell.marked})`
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
                      : percentageCellClass(cell?.percentage ?? null),
                  isToday && !showingStale && "ring-2 ring-primary",
                )}
              >
                <span className="text-[0.7rem] font-medium sm:text-sm">{dayNumber}</span>
                {!isFuture && !showingStale && cell?.percentage != null && (
                  <span className="text-[0.6rem] font-bold sm:text-xs">
                    {Math.round(cell.percentage)}%
                  </span>
                )}
              </div>
            );
          }}
        />
      </Panel>
    </div>
  );
}
