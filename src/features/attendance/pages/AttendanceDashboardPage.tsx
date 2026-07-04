import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  FileCheck,
  CircleDashed,
  School,
  CalendarDays,
  Layers,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import { StatCard } from "@/shared/components/ui/Card";
import { StatCardSkeleton } from "@/shared/components/ui/Skeleton";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { isoToIndianDate } from "@/shared/lib/utils";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function AttendanceDashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [schoolId, setSchoolId] = useState<string | undefined>(
    isAdmin ? undefined : user?.school_id ?? undefined,
  );
  const [schoolName, setSchoolName] = useState("");
  const [session, setSession] = useState("2025-26");
  const [date, setDate] = useState(todayIso());

  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isSearching: schoolsLoading,
  } = useSchoolSearch();

  const ready = !isAdmin || !!schoolName;

  const { data, isFetching, isLoading, isError } = useQuery({
    queryKey: ["attendance", "dashboard", schoolName, session, date],
    queryFn: () =>
      attendanceApi.getDashboard({
        session,
        date: isoToIndianDate(date),
        ...(isAdmin && schoolName ? { school_name: schoolName } : {}),
      }),
    enabled: ready,
    staleTime: 60_000,
  });

  const handleSchoolChange = (id: string) => {
    setSchoolId(id);
    setSchoolName(schoolOptions.find((o) => o.value === id)?.label ?? "");
  };

  const holidays = useHolidayDates({ session, schoolName, enabled: ready });

  const marked = data?.total_marked ?? 0;
  const enrolled = data?.total_enrolled ?? 0;
  const markedPct = enrolled > 0 ? Math.round((marked / enrolled) * 100) : 0;

  return (
    <div className="space-y-6">
      <FilterBar title="Scope" icon={<CalendarDays className="h-4 w-4" />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {isAdmin && (
            <SearchableSelect
              label="School"
              placeholder="Select school..."
              options={schoolOptions}
              value={schoolId}
              onChange={handleSchoolChange}
              onSearchChange={setSchoolQuery}
              isLoading={schoolsLoading}
            />
          )}
          <Select
            label="Session"
            options={SESSION_OPTIONS}
            value={session}
            onChange={(e) => setSession(e.target.value)}
          />
          <DatePicker
            label="Date"
            max={todayIso()}
            value={date}
            onChange={(iso) => setDate(iso ?? todayIso())}
            fadeSundays
            holidays={holidays}
          />
        </div>
      </FilterBar>

      {!ready ? (
        <EmptyState
          icon={<School className="h-10 w-10" />}
          title="Select a school"
          description="Choose a school above to see its attendance snapshot for the day."
        />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="Nothing recorded yet"
          description={`No attendance has been marked for ${isoToIndianDate(date)}. Pick another date or mark attendance to see the snapshot.`}
        />
      ) : (
        <>
          {/* Context banner: who / when / how much is marked, at a glance */}
          <section className="overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-card">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                  <School className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">
                    {data?.school_name}
                  </p>
                  <p className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {data?.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {data?.classes_marked ?? 0} class-section(s)
                    </span>
                    {isFetching && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Refreshing
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-64">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">
                    Roster marked
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {marked} / {enrolled}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${markedPct}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Present"
              value={data?.present ?? 0}
              icon={<UserCheck className="h-5 w-5" />}
              color="success"
            />
            <StatCard
              label="Absent"
              value={data?.absent ?? 0}
              icon={<UserX className="h-5 w-5" />}
              color="danger"
            />
            <StatCard
              label="Late"
              value={data?.late ?? 0}
              icon={<Clock className="h-5 w-5" />}
              color="warning"
            />
            <StatCard
              label="Excused"
              value={data?.excused ?? 0}
              icon={<FileCheck className="h-5 w-5" />}
              color="info"
            />
            <StatCard
              label="Half Day"
              value={data?.half_day ?? 0}
              icon={<CircleDashed className="h-5 w-5" />}
            />
            <StatCard
              label="Attendance %"
              value={`${data?.attendance_percentage ?? 0}%`}
              icon={<Users className="h-5 w-5" />}
              color="primary"
            />
          </div>
        </>
      )}
    </div>
  );
}
