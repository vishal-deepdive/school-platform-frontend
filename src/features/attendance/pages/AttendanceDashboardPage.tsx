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
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import { Card, StatCard } from "@/shared/components/ui/Card";
import { StatCardSkeleton } from "@/shared/components/ui/Skeleton";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { Badge } from "@/shared/components/ui/Badge";
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

  return (
    <div className="space-y-6">
      <Card>
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
      </Card>

      {!ready ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted-foreground">
            Select a school to view its dashboard.
          </p>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No attendance recorded for {isoToIndianDate(date)} yet.
          </p>
        </Card>
      ) : (
        <>
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

          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="info">
                <School className="mr-1 inline h-3.5 w-3.5" />
                {data?.school_name}
              </Badge>
              <Badge>{data?.date}</Badge>
              <Badge variant="default">
                {data?.total_marked ?? 0} / {data?.total_enrolled ?? 0} marked
              </Badge>
              <Badge variant="default">
                {data?.classes_marked ?? 0} class-section(s) marked
              </Badge>
              {isFetching && (
                <span className="text-xs text-muted-foreground">Refreshing…</span>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
