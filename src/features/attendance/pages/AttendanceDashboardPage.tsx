import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileCheck,
  Loader2,
  Users,
  UserX,
} from "lucide-react";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS, getCurrentSession } from "@/features/attendance/constants";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { StatusDonut } from "@/features/dashboard/components/StatusDonut";
import { Button } from "@/shared/components/ui/Button";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiStrip } from "@/shared/components/ui/KpiStrip";
import { Panel } from "@/shared/components/ui/Panel";
import { Select } from "@/shared/components/ui/Select";
import { ChartSkeleton, Skeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { isoToIndianDate } from "@/shared/lib/utils";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function AttendanceDashboardPage() {
  const { schoolName, ready } = useActiveSchool();
  const defaults = useMemo(() => ({ session: getCurrentSession(), date: todayIso() }), []);
  const [{ session, date }, update] = useUrlState(defaults);

  const { data, isFetching, isLoading, isError } = useQuery({
    queryKey: ["attendance", "dashboard", schoolName, session, date],
    queryFn: () =>
      attendanceApi.getDashboard({
        session,
        date: isoToIndianDate(date),
        ...(schoolName ? { school_name: schoolName } : {}),
      }),
    enabled: ready,
    staleTime: 60_000,
  });

  const holidays = useHolidayDates({ session, schoolName, enabled: ready });

  const marked = data?.total_marked ?? 0;
  const enrolled = data?.total_enrolled ?? 0;
  const markedPct = pctOf(marked, enrolled);
  const unmarked = Math.max(0, enrolled - marked);
  const isToday = date === todayIso();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="sm:w-36">
            <Select
              aria-label="Session"
              options={SESSION_OPTIONS}
              value={session}
              onChange={(e) => update({ session: e.target.value })}
            />
          </div>
          <div className="sm:w-44">
            <DatePicker
              max={todayIso()}
              value={date}
              onChange={(iso) => update({ date: iso ?? todayIso() })}
              fadeSundays
              holidays={holidays}
            />
          </div>
        </div>
        <StatLine
          loading={isLoading}
          items={[
            { label: data?.school_name ?? "", hidden: !data?.school_name },
            {
              value: data?.classes_marked ?? 0,
              label: data?.classes_marked === 1 ? "class-section marked" : "class-sections marked",
              hidden: !data,
            },
            {
              label: "Refreshing",
              icon: <Loader2 className="animate-spin" />,
              hidden: !(isFetching && !isLoading),
            },
          ]}
        />
      </div>

      {isError ? (
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="Nothing recorded yet"
          description={`No attendance has been marked for ${isoToIndianDate(date)}. Pick another date or mark attendance to see the snapshot.`}
          action={
            isToday ? (
              <Button asChild size="sm">
                <Link to="/attendance/mark">Mark attendance</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <KpiStrip
            loading={isLoading}
            items={[
              {
                label: "Attendance rate",
                value: data && data.total_marked > 0 ? `${data.attendance_percentage}%` : "—",
                icon: <Users />,
                hint: `${(data?.present ?? 0).toLocaleString()} present`,
              },
              {
                label: "Marked",
                value: `${marked.toLocaleString()} / ${enrolled.toLocaleString()}`,
                icon: <CheckSquare />,
                hint: `${markedPct}% of the roster`,
              },
              {
                label: "Absent",
                value: (data?.absent ?? 0).toLocaleString(),
                icon: <UserX />,
                tone: "danger",
                hint: `${pctOf(data?.absent ?? 0, marked)}% of marked`,
              },
              {
                label: "Excused",
                value: (data?.excused ?? 0).toLocaleString(),
                icon: <FileCheck />,
                tone: "info",
                hint: "Approved leave",
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <StatusDonut
                counts={data}
                title="Today's mix"
                subtitle="How the day's marks break down"
                centerLabel={data && data.total_marked > 0 ? `${data.attendance_percentage}%` : "—"}
                centerSub="present"
              />
            )}

            <Panel
              className="lg:col-span-2"
              icon={<ClipboardList className="h-4 w-4" />}
              title="Roster coverage"
              description={`Marks recorded for ${isoToIndianDate(date)}`}
            >
              {isLoading ? (
                <div className="space-y-4" aria-hidden="true">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-2.5 w-full rounded-full" />
                  <Skeleton className="h-12 w-2/3" />
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                      <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
                        {markedPct}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {unmarked > 0
                          ? `${unmarked.toLocaleString()} ${unmarked === 1 ? "student" : "students"} not marked yet`
                          : "Everyone on the roster is marked"}
                      </p>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label="Roster marked"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={markedPct}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${markedPct}%` }}
                      />
                    </div>
                  </div>

                  <dl className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Class-sections", value: data?.classes_marked ?? 0 },
                      { label: "Late", value: data?.late ?? 0 },
                      { label: "Half day", value: data?.half_day ?? 0 },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-xs text-muted-foreground">{item.label}</dt>
                        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                          {item.value.toLocaleString()}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {isToday && unmarked > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                      <Button asChild size="sm">
                        <Link to="/attendance/mark">
                          <CheckSquare className="h-4 w-4" />
                          Mark attendance
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/attendance/roll-call">
                          <ClipboardList className="h-4 w-4" />
                          Roll call
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
