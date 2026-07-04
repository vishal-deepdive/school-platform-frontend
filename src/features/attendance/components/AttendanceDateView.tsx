import { useAuthStore } from "@/features/auth/store/auth";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Download,
  CalendarX,
  UserCheck,
  UserX,
  Clock,
  FileCheck,
  CircleDashed,
  Percent,
} from "lucide-react";
import {
  isoToIndianDate,
  downloadBlob,
  getErrorMessage,
} from "@/shared/lib/utils";
import { usePersistedState } from "@/shared/hooks/usePersistedState";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { Card, CardHeader, StatCard } from "@/shared/components/ui/Card";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { TableSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Table } from "@/shared/components/ui/Table";
import type { Column } from "@/shared/components/ui/Table";
import {
  statusLabel,
  statusVariant,
  statusIcon,
} from "@/features/attendance/lib/status";
import {
  AttendanceScopeFilters,
  type ScopeValue,
} from "@/features/attendance/components/AttendanceScopeFilters";
import { StatusLegend } from "@/features/attendance/components/StatusLegend";
import type {
  AttendanceDateRow,
  AttendanceStatus,
} from "@/features/attendance/types";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "P", label: "Present" },
  { value: "A", label: "Absent" },
  { value: "L", label: "Late" },
  { value: "E", label: "Excused" },
  { value: "H", label: "Half Day" },
];

const SORT_OPTIONS = [
  { value: "roll", label: "Roll number" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
];

const StatusCell = (row: AttendanceDateRow) => {
  const Icon = statusIcon(String(row.attendance_record));
  return (
    <Badge variant={statusVariant(String(row.attendance_record))}>
      <Icon className="mr-1 inline h-3.5 w-3.5" />
      {statusLabel(String(row.attendance_record))}
    </Badge>
  );
};

const DATE_COLUMNS: Column<AttendanceDateRow>[] = [
  { key: "roll_number", header: "Roll No", render: (r) => String(r.roll_number ?? "—") },
  { key: "name", header: "Name", render: (r) => String(r.name ?? "—") },
  { key: "class", header: "Class", render: (r) => String(r.class ?? "—") },
  { key: "section", header: "Section", render: (r) => String(r.section ?? "—") },
  { key: "subject", header: "Subject", render: (r) => String(r.subject || "—") },
  { key: "attendance_record", header: "Status", render: StatusCell },
  { key: "time", header: "Time", render: (r) => String(r.time || "—") },
];

interface AppliedFilters {
  scope: ScopeValue;
  date: string; // ISO
}

export function AttendanceDateView() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [scope, setScope] = usePersistedState<ScopeValue>("att.dateview.scope", {
    schoolName: "",
    className: "",
    section: "",
    subject: "",
  });
  const [dateIso, setDateIso] = useState(todayIso());
  const [applied, setApplied] = useState<AppliedFilters | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("roll");

  const scopeReady = !isAdmin || !!scope.schoolName;

  const holidays = useHolidayDates({
    session: "2025-26",
    schoolName: scope.schoolName || undefined,
    enabled: !!scope.schoolName,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["attendance", "date", applied],
    queryFn: () => {
      const s = applied!.scope;
      return attendanceApi.getAttendanceOnDate({
        date: isoToIndianDate(applied!.date),
        ...(isAdmin && s.schoolName ? { school_name: s.schoolName } : {}),
        ...(s.className ? { class_name: s.className } : {}),
        ...(s.section ? { section: s.section } : {}),
        ...(s.subject ? { subject: s.subject } : {}),
      });
    },
    enabled: !!applied,
    staleTime: 60_000,
  });

  const rows = useMemo(() => data?.data ?? [], [data]);

  const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { P: 0, A: 0, L: 0, E: 0, H: 0 };
    for (const r of rows) {
      const s = String(r.attendance_record) as AttendanceStatus;
      if (s in c) c[s] += 1;
    }
    return c;
  }, [rows]);

  const pct =
    rows.length > 0 ? Math.round((counts.P / rows.length) * 100) : 0;

  const visible = useMemo(() => {
    let out = rows;
    if (statusFilter) out = out.filter((r) => r.attendance_record === statusFilter);
    const q = search.trim().toLowerCase();
    if (q)
      out = out.filter(
        (r) =>
          String(r.roll_number).toLowerCase().includes(q) ||
          String(r.name ?? "").toLowerCase().includes(q),
      );
    const sorted = [...out];
    sorted.sort((a, b) => {
      if (sortBy === "name")
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      if (sortBy === "status")
        return String(a.attendance_record).localeCompare(String(b.attendance_record));
      return String(a.roll_number).localeCompare(String(b.roll_number), undefined, {
        numeric: true,
      });
    });
    return sorted;
  }, [rows, statusFilter, search, sortBy]);

  const runSearch = () => setApplied({ scope, date: dateIso });

  const handleExportCSV = async () => {
    if (!applied) return;
    const s = applied.scope;
    const blob = await attendanceApi.exportAttendanceOnDate({
      date: isoToIndianDate(applied.date),
      ...(isAdmin && s.schoolName ? { school_name: s.schoolName } : {}),
      ...(s.className ? { class_name: s.className } : {}),
      ...(s.section ? { section: s.section } : {}),
      ...(s.subject ? { subject: s.subject } : {}),
    });
    downloadBlob(blob, `attendance-${isoToIndianDate(applied.date)}.csv`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Attendance on a Date"
          description="Pick a class and day to see who was present."
        />
        <div className="space-y-4">
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
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={runSearch}
              disabled={!scopeReady}
              icon={<Search className="h-4 w-4" />}
            >
              Search
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!applied || rows.length === 0}
              icon={<Download className="h-4 w-4" />}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

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
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Present" value={counts.P} icon={<UserCheck className="h-5 w-5" />} color="success" />
            <StatCard label="Absent" value={counts.A} icon={<UserX className="h-5 w-5" />} color="danger" />
            <StatCard label="Late" value={counts.L} icon={<Clock className="h-5 w-5" />} color="warning" />
            <StatCard label="Excused" value={counts.E} icon={<FileCheck className="h-5 w-5" />} color="info" />
            <StatCard label="Half Day" value={counts.H} icon={<CircleDashed className="h-5 w-5" />} />
            <StatCard label="Present %" value={`${pct}%`} icon={<Percent className="h-5 w-5" />} color="primary" />
          </div>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {data.total_records} record(s) on {data.date} · showing {visible.length}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search roll or name…"
                    className="w-48 rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm text-foreground"
                  />
                </div>
                <Select
                  options={STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
                <Select
                  options={SORT_OPTIONS}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                />
              </div>
            </div>
            <StatusLegend className="mb-4" />
            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No students match the current filters.
              </p>
            ) : (
              <Table columns={DATE_COLUMNS} data={visible} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
