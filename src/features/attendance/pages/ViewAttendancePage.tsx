import { useState, useRef, useMemo } from "react";
import { CalendarDays, CalendarRange, CalendarX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/auth";
import { isoToIndianDate, getErrorMessage } from "@/shared/lib/utils";
import {
  AttendanceRangeView,
  ClassAttendanceCalendar,
  SelfAttendanceView,
} from "@/features/attendance/components";
import { isStaff } from "@/shared/lib/permissions";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { AttendanceResults } from "@/features/attendance/components/AttendanceResults";
import { ModuleHeaderLeading } from "@/shared/components/ui/ModuleHeaderActions";
import { SegmentedControl, type SegmentOption } from "@/shared/components/ui/SegmentedControl";
import { TableSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import type { ScopeValue } from "@/features/attendance/components/AttendanceScopeFilters";

type View = "calendar" | "range";

const VIEWS: SegmentOption<View>[] = [
  { value: "calendar", label: "Calendar", icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { value: "range", label: "Date range", icon: <CalendarRange className="h-3.5 w-3.5" /> },
];
const URL_DEFAULTS: { view: string } = { view: "calendar" };

export function ViewAttendancePage() {
  const { schoolName } = useActiveSchool();
  const [attendanceFilter, setAttendanceFilter] = useState<{
    date: string;
    scope: ScopeValue;
  } | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const [state, update] = useUrlState(URL_DEFAULTS);
  const view: View = state.view === "range" ? "range" : "calendar";

  const resultsRef = useRef<HTMLDivElement>(null);

  const handleDateSelect = (date: string, scope: ScopeValue) => {
    setAttendanceFilter({ date, scope });
    // Smooth auto-scroll to the details table container
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["attendance", "date", attendanceFilter, schoolName],
    enabled: !!attendanceFilter,
    staleTime: 60_000,
    queryFn: () => {
      const s = attendanceFilter!.scope;
      return attendanceApi.getAttendanceOnDate({
        date: isoToIndianDate(attendanceFilter!.date),
        ...(schoolName ? { school_name: schoolName } : {}),
        ...(s.className?.trim() ? { class_name: s.className.trim() } : {}),
        ...(s.section?.trim() ? { section: s.section.trim() } : {}),
        ...(s.subject?.trim() ? { subject: s.subject.trim() } : {}),
      });
    },
  });

  const rows = useMemo(() => data?.data ?? [], [data]);

  // Students and Parents get individual / child-scoped read-only views
  if (!isStaff(role)) {
    return <SelfAttendanceView />;
  }

  return (
    <div className="space-y-6">
      <ModuleHeaderLeading>
        <SegmentedControl
          aria-label="Attendance view"
          compact
          options={VIEWS}
          value={view}
          onChange={(next) => update({ view: next }, { push: true })}
        />
      </ModuleHeaderLeading>

      {view === "range" && <AttendanceRangeView />}

      {view === "calendar" && (
        <>
          <ClassAttendanceCalendar
            selectedDate={attendanceFilter?.date ?? null}
            onDateSelect={handleDateSelect}
          />

          <div ref={resultsRef} className="scroll-mt-6">
            {isLoading && <TableSkeleton rows={6} columns={5} />}

            {isError && (
              <Alert variant="error">
                {getErrorMessage(error) || "Failed to fetch attendance records."}
              </Alert>
            )}

            {data && rows.length === 0 && (
              <EmptyState
                icon={<CalendarX className="h-10 w-10" />}
                title="No records for this date"
                description="No attendance has been marked for the selected class and date."
              />
            )}

            {data && rows.length > 0 && (
              <AttendanceResults rows={rows} date={data.date} totalRecords={data.total_records} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
