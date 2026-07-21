import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter, isValid, parse, startOfMonth } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { usePersistedState } from "@/shared/hooks/usePersistedState";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { percentageCellClass } from "@/features/attendance/lib/status";
import {
  AttendanceScopeFilters,
  type ScopeValue,
} from "@/features/attendance/components/AttendanceScopeFilters";
import { MonthCalendarShell } from "@/features/attendance/components/MonthCalendarShell";
import { Alert } from "@/shared/components/ui/Alert";
import { Panel } from "@/shared/components/ui/Panel";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import type { ClassCalendarDay } from "@/features/attendance/types";

function dayCellSkeleton(i: number) {
  return <Skeleton key={i} className="aspect-square rounded-lg" />;
}

interface Props {
  selectedDate?: string | null;
  onDateSelect?: (date: string, scope: ScopeValue) => void;
}

/**
 * Month-grid calendar showing daily class attendance percentage for staff.
 * Each day is a color-graded cell (green ≥75%, amber 60–74%, red <60%,
 * neutral when unmarked/weekend). Scoped to a class/section or the caller's
 * full class scope (teachers without an explicit class see their assigned
 * classes combined).
 */
export function ClassAttendanceCalendar({selectedDate,onDateSelect}:Props) {
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


  return (
    <div className="space-y-6">
      {/* <FilterBar title="Scope" icon={<Users className="h-4 w-4" />}>
        <AttendanceScopeFilters value={scope} onChange={setScope} showSubject={false} />
      </FilterBar> */}

      {isError && (
        <Alert variant="error">
          {getErrorMessage(error) || "Failed to load the class attendance calendar."}
        </Alert>
      )}

      <Panel
        icon={<CalendarDays className="h-4 w-4" />}
        title="Daily attendance %"
        description={isFetching ? "Updating…" : undefined}
        actions={
          <div className="flex items-end gap-5">
            <div className="min-w-[180px]">
                <AttendanceScopeFilters
                value={scope}
                onChange={setScope}
                showSubject={false}
                />
            </div>
          </div>
            
          }
        
        
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
              <button
                type="button"
                onClick={() => {
                  if (!isFuture) {
                    onDateSelect?.(key, scope);
                  }
                }}
                className={cn(
                  "appearance-none border-0 bg-transparent p-0",
                  "flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-lg text-xs transition-colors",
                  isFuture
                    ? "text-muted-foreground/25"
                    : showingStale
                      ? "bg-muted/30 text-muted-foreground/40"
                      : percentageCellClass(cell?.percentage ?? null),
                  isToday && !showingStale && "ring-2 ring-primary",
                  selectedDate === key && "ring-2 ring-blue-500"
                )}
                title={showingStale ? undefined : `${dayLabel} — ${statusLabel}`}
                aria-label={`${dayLabel}: ${statusLabel}`}
              >
                <span className="text-[0.7rem] font-medium sm:text-sm">
                  {dayNumber}
                </span>

                {!isFuture && !showingStale && cell?.percentage != null && (
                  <span className="text-[0.6rem] font-bold sm:text-xs">
                    {Math.round(cell.percentage)}%
                  </span>
                )}
              </button>
            );
          }}
        />
      </Panel>
    </div>
  );
}
