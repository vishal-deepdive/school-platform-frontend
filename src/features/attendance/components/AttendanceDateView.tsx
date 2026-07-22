import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Download,
  CalendarX,
} from "lucide-react";
import {
  isoToIndianDate,
  downloadBlob,
  getErrorMessage,
  jsonToCsv,
} from "@/shared/lib/utils";
import { usePersistedState } from "@/shared/hooks/usePersistedState";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { Button } from "@/shared/components/ui/Button";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { TableSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import {
  statusLabel,
} from "@/features/attendance/lib/status";
import {
  AttendanceScopeFilters,
  type ScopeValue,
} from "@/features/attendance/components/AttendanceScopeFilters";



import { AttendanceResults } from "@/features/attendance/components/AttendanceResults";
import { getCurrentSession } from "../constants";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}


interface AppliedFilters {
  scope: ScopeValue;
  date: string; // ISO
}



export function AttendanceDateView() {
  const { schoolId, schoolName, ready: scopeReady } = useActiveSchool();

  const [scope, setScope] = usePersistedState<ScopeValue>("att.dateview.scope", {
    className: "",
    section: "",
    subject: "",
  });
  const [dateIso, setDateIso] = useState(todayIso());
  const [applied, setApplied] = useState<AppliedFilters | null>(null);


  // Switching the active school invalidates any applied search from the old one.
  useEffect(() => setApplied(null), [schoolId]);

  const holidays = useHolidayDates({
    session: getCurrentSession(),
    schoolName: schoolName || undefined,
    enabled: !!schoolName,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["attendance", "date", applied, schoolName],
    queryFn: () => {
      const s = applied!.scope;
      return attendanceApi.getAttendanceOnDate({
        date: isoToIndianDate(applied!.date),
        ...(schoolName ? { school_name: schoolName } : {}),
        ...(s.className ? { class_name: s.className } : {}),
        ...(s.section ? { section: s.section } : {}),
        ...(s.subject ? { subject: s.subject } : {}),
      });
    },
    enabled: !!applied,
    staleTime: 60_000,
  });

  const rows = useMemo(() => data?.data ?? [], [data]);


  const runSearch = () => setApplied({ scope, date: dateIso });

  const handleExportCSV = async () => {
    if (!applied || rows.length === 0) return;
    const csvContent = jsonToCsv(rows, [
      { header: "Roll No", getValue: (r) => String(r.roll_number ?? "—") },
      { header: "Name", getValue: (r) => String(r.name ?? "—") },
      { header: "Class", getValue: (r) => String(r.class ?? "—") },
      { header: "Section", getValue: (r) => String(r.section ?? "—") },
      { header: "Subject", getValue: (r) => String(r.subject || "—") },
      { header: "Status", getValue: (r) => statusLabel(String(r.attendance_record)) },
      { header: "Time", getValue: (r) => String(r.time || "—") },
    ]);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `attendance-${isoToIndianDate(applied.date)}.csv`);
  };

  return (
    <div className="space-y-6">
      <FilterBar
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!applied || rows.length === 0}
              icon={<Download className="h-4 w-4" />}
            >
              Export CSV
            </Button>
            
                <Button
                  onClick={runSearch}
                  disabled={!scopeReady}
                  icon={<Search className="h-4 w-4" />}
                >
                  Search
                </Button>
              
            
          </>
        }
      >
        <AttendanceScopeFilters value={scope} onChange={setScope} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <DatePicker
            label="Date"
            max={todayIso()}
            value={dateIso}
            onChange={(iso) => setDateIso(iso ?? todayIso())}
            fadeSundays
            holidays={holidays}
          />
        </div>
      </FilterBar>

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
          description="No attendance has been marked for the selected class, section, and date. Try a different date or mark attendance first."
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
  );
}
