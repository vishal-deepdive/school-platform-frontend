import { useRef,useState,useEffect } from "react";
import {  CalendarDays, CalendarRange } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { cn } from "@/shared/lib/utils";
import {
  AttendanceRangeView,
  ClassAttendanceCalendar,
  SelfAttendanceView,
} from "@/features/attendance/components";
import { isStaff } from "@/shared/lib/permissions";

//
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { AttendanceResults } from "@/features/attendance/components/AttendanceResults";

import { TableSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";

import { CalendarX } from "lucide-react";

import {
  isoToIndianDate,
  getErrorMessage,
} from "@/shared/lib/utils";

import type { ScopeValue } from "@/features/attendance/components/AttendanceScopeFilters";
//

const viewTabs = [
  {
    id: "calendar",
    label: "Calendar",
    hint: "Monthly %",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    id: "range",
    label: "Date Range",
    hint: "Span of days",
    icon: <CalendarRange className="h-4 w-4" />,
  },
];

export function ViewAttendancePage() {
  // const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { schoolName } = useActiveSchool();

  const resultsRef = useRef<HTMLDivElement>(null);
  
  const [attendanceFilter, setAttendanceFilter] = useState<{
  date: string;
  scope: ScopeValue;
} | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const [tab, setTab] = useState("calendar");
  
  const { data, isLoading, isError, error } = useQuery({
  queryKey: ["attendance", "date", attendanceFilter, schoolName],

  enabled: !!attendanceFilter,

  staleTime: 60_000,

  queryFn: () => {
    const s = attendanceFilter!.scope;

    return attendanceApi.getAttendanceOnDate({
      date: isoToIndianDate(attendanceFilter!.date),

      ...(schoolName ? { school_name: schoolName } : {}),

      ...(s.className ? { class_name: s.className } : {}),

      ...(s.section ? { section: s.section } : {}),

      ...(s.subject ? { subject: s.subject } : {}),
    });
  },
});

useEffect(() => {
    if (!attendanceFilter || isLoading || !data) return;

    resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
}, [attendanceFilter, data, isLoading]);

const rows = useMemo(() => data?.data ?? [], [data]);
  if (!isStaff(role)) {
    return <SelfAttendanceView />;
  }


  return (
    <div className="space-y-6">
      {/* Modern segmented control — clearer than an underline tab row */}
      <div className="inline-flex w-full gap-1 rounded-2xl border border-border/60 bg-gray-100 dark:bg-muted p-1 sm:w-auto">
        {viewTabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all sm:flex-none",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={active ? "text-primary" : ""}>{t.icon}</span>
              {t.label}
              <span className="hidden text-xs font-normal text-muted-foreground/70 md:inline">
                · {t.hint}
              </span>
            </button>
          );
        })}
      </div>

      {/* {tab === "date" && <AttendanceDateView />} */}
      {tab === "range" && <AttendanceRangeView />}
      {tab === "calendar" && (
  <>
    <ClassAttendanceCalendar
      selectedDate={attendanceFilter?.date ?? null}
      onDateSelect={(date, scope) => {
        setAttendanceFilter({
          date,
          scope,
        });
      }}
    />

    {isLoading && <TableSkeleton rows={6} columns={5} />}

    {isError && (
      <Alert variant="error">
        {getErrorMessage(error) || "Failed to fetch attendance records."}
      </Alert>
    )}

    <div ref={resultsRef} className="mt-8 scroll-mt-24">
      {data && rows.length === 0 && (
        <EmptyState
          icon={<CalendarX className="h-10 w-10" />}
          title="No records for this date"
          description="No attendance has been marked for the selected class and date."
        />
      )}

      {data && rows.length > 0 && (
          <AttendanceResults
            rows={rows}
            date={data.date}
            totalRecords={data.total_records}
          />
      )}
    </div>
  </>
)}
    </div>
  );
}
