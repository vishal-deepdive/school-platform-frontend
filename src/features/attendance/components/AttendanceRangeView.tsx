import { useAuthStore } from "@/features/auth/store/auth";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Download,
  AlertTriangle,
  CalendarX,
  Users,
  Percent,
} from "lucide-react";
import toast from "react-hot-toast";
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
import { statusTextClass, statusLabel } from "@/features/attendance/lib/status";
import {
  AttendanceScopeFilters,
  type ScopeValue,
} from "@/features/attendance/components/AttendanceScopeFilters";
import { StatusLegend } from "@/features/attendance/components/StatusLegend";
import type { AttendanceRangeStudent } from "@/features/attendance/types";

const MAX_RANGE_DAYS = 92; // must match the server-side cap
const PAGE_SIZE = 30;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function isoDaysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function firstOfMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// "DD-MM-YYYY" → true when that date falls on a Sunday.
function isSundayDMY(dmy: string): boolean {
  const [d, m, y] = dmy.split("-").map(Number);
  if (!d || !m || !y) return false;
  return new Date(y, m - 1, d).getDay() === 0;
}

const SORT_OPTIONS = [
  { value: "roll", label: "Roll number" },
  { value: "name", label: "Name" },
  { value: "pct_asc", label: "Attendance % (low→high)" },
  { value: "pct_desc", label: "Attendance % (high→low)" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All students" },
  { value: "below75", label: "Below 75%" },
  { value: "absences", label: "Has absences" },
];

interface AppliedFilters {
  scope: ScopeValue;
  start: string; // ISO
  end: string; // ISO
}

export function AttendanceRangeView() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [scope, setScope] = usePersistedState<ScopeValue>("att.rangeview.scope", {
    schoolName: "",
    className: "",
    section: "",
    subject: "",
  });
  const [startIso, setStartIso] = useState(isoDaysAgo(7));
  const [endIso, setEndIso] = useState(todayIso());
  const [applied, setApplied] = useState<AppliedFilters | null>(null);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("roll");
  const [page, setPage] = useState(0);

  // Debounce the search box so we fire one request after typing settles, not
  // one per keystroke (filtering now happens server-side).
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Filter/search/sort changes restart at page 0; the server owns pagination.
  useEffect(() => setPage(0), [applied, filter, debouncedSearch, sortBy]);

  const scopeReady = !isAdmin || !!scope.schoolName;

  const holidays = useHolidayDates({
    session: "2025-26",
    schoolName: scope.schoolName || undefined,
    enabled: !!scope.schoolName,
  });

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: [
      "attendance",
      "range",
      applied,
      page,
      sortBy,
      filter,
      debouncedSearch,
    ],
    queryFn: () => {
      const s = applied!.scope;
      return attendanceApi.getAttendanceRange({
        start_date: isoToIndianDate(applied!.start),
        end_date: isoToIndianDate(applied!.end),
        page: String(page),
        page_size: String(PAGE_SIZE),
        sort_by: sortBy,
        student_filter: filter,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(isAdmin && s.schoolName ? { school_name: s.schoolName } : {}),
        ...(s.className ? { class_name: s.className } : {}),
        ...(s.section ? { section: s.section } : {}),
        ...(s.subject ? { subject: s.subject } : {}),
      });
    },
    enabled: !!applied,
    staleTime: 60_000,
    placeholderData: (prev) => prev, // keep the grid visible while paging
  });

  const runSearch = () => {
    const spanDays =
      Math.round(
        (new Date(endIso).getTime() - new Date(startIso).getTime()) / 86400000,
      ) + 1;
    if (spanDays <= 0) {
      toast.error("Start date must be on or before end date");
      return;
    }
    if (spanDays > MAX_RANGE_DAYS) {
      toast.error(`Please pick a range of at most ${MAX_RANGE_DAYS} days`);
      return;
    }
    setApplied({ scope, start: startIso, end: endIso });
  };

  const handleExportCSV = async () => {
    if (!applied) return;
    const s = applied.scope;
    const blob = await attendanceApi.exportAttendanceRange({
      start_date: isoToIndianDate(applied.start),
      end_date: isoToIndianDate(applied.end),
      ...(isAdmin && s.schoolName ? { school_name: s.schoolName } : {}),
      ...(s.className ? { class_name: s.className } : {}),
      ...(s.section ? { section: s.section } : {}),
      ...(s.subject ? { subject: s.subject } : {}),
    });
    downloadBlob(
      blob,
      `attendance-${isoToIndianDate(applied.start)}_${isoToIndianDate(applied.end)}.csv`,
    );
  };

  // The server does aggregation, filtering, sorting and pagination; rows arrive
  // ready to render. `pageRows` is just the current page's students.
  const pageRows = data?.data ?? [];
  const dates = useMemo(() => data?.dates ?? [], [data]);
  const summary = data?.summary;
  const pagination = data?.pagination;
  const sundaySet = useMemo(
    () => new Set(dates.filter(isSundayDMY)),
    [dates],
  );
  const todayDmy = isoToIndianDate(todayIso());

  const avgPct = Math.round(summary?.avg_percentage ?? 0);
  const belowCount = summary?.below_75_count ?? 0;
  const pageCount = pagination?.total_pages ?? 1;

  const pctBadge = (p: number) =>
    p >= 75 ? "success" : p >= 70 ? "warning" : "danger";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Attendance Over Date Range"
          description="Per-student daily grid with attendance percentages. Max 92 days per query."
        />
        <div className="space-y-4">
          <AttendanceScopeFilters value={scope} onChange={setScope} showSubject />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <DatePicker
              label="Start date"
              max={todayIso()}
              value={startIso}
              onChange={(iso) => setStartIso(iso ?? isoDaysAgo(7))}
              fadeSundays
              holidays={holidays}
            />
            <DatePicker
              label="End date"
              max={todayIso()}
              value={endIso}
              onChange={(iso) => setEndIso(iso ?? todayIso())}
              fadeSundays
              holidays={holidays}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Quick range:</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setStartIso(isoDaysAgo(6));
                setEndIso(todayIso());
              }}
            >
              Last 7 days
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setStartIso(isoDaysAgo(29));
                setEndIso(todayIso());
              }}
            >
              Last 30 days
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setStartIso(firstOfMonthIso());
                setEndIso(todayIso());
              }}
            >
              This month
            </Button>
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
              disabled={!applied || !summary || summary.total_students === 0}
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
          {getErrorMessage(error) || "Failed to fetch attendance range."}
        </Alert>
      )}

      {data && summary && summary.total_students === 0 && (
        <EmptyState
          icon={<CalendarX className="h-10 w-10" />}
          title="No records in this range"
          description="No attendance was found for the selected class, section, and date range."
        />
      )}

      {data && summary && pagination && summary.total_students > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Students" value={summary.total_students} icon={<Users className="h-5 w-5" />} color="primary" />
            <StatCard label="Days" value={data.date_range.total_days} color="info" />
            <StatCard label="Avg attendance" value={`${avgPct}%`} icon={<Percent className="h-5 w-5" />} color={avgPct >= 75 ? "success" : "warning"} />
            <StatCard label="Below 75%" value={belowCount} icon={<AlertTriangle className="h-5 w-5" />} color="danger" />
          </div>

          {belowCount > 0 && filter !== "below75" && (
            <Alert
              variant="warning"
              title={`${belowCount} student(s) below 75% attendance`}
            >
              <div className="mt-2">
                <Button size="sm" variant="secondary" onClick={() => setFilter("below75")}>
                  Show them
                </Button>
              </div>
            </Alert>
          )}

          <Card padding="none">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {data.date_range.start_date} – {data.date_range.end_date} ·{" "}
                {pagination.filtered_students} student(s) match
                {isFetching ? " · updating…" : ""}
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
                <Select options={FILTER_OPTIONS} value={filter} onChange={(e) => setFilter(e.target.value)} />
                <Select options={SORT_OPTIONS} value={sortBy} onChange={(e) => setSortBy(e.target.value)} />
              </div>
            </div>

            <div className="px-4 py-3">
              <StatusLegend />
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr>
                    <th className="sticky left-0 z-20 bg-muted px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Student
                    </th>
                    <th className="bg-muted px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      %
                    </th>
                    {dates.map((d) => (
                      <th
                        key={d}
                        className={`px-2 py-3 text-center text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap ${
                          sundaySet.has(d) ? "bg-muted-foreground/10" : ""
                        } ${d === todayDmy ? "ring-1 ring-inset ring-primary/40" : ""}`}
                        title={sundaySet.has(d) ? `${d} (Sunday)` : d}
                      >
                        {d.slice(0, 5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {pageRows.map((student: AttendanceRangeStudent) => (
                    <tr key={student.roll_number} className="hover:bg-muted/50">
                      <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {student.below_75_percent === "Yes" && (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                          <div>
                            <p>{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              #{student.roll_number}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={pctBadge(student.attendance_percentage)}>
                          {student.attendance_percentage.toFixed(0)}%
                        </Badge>
                      </td>
                      {dates.map((d, i) => {
                        const val = student.cells[i] ?? "-";
                        return (
                          <td
                            key={d}
                            className={`px-2 py-3 text-center ${
                              sundaySet.has(d) ? "bg-muted-foreground/5" : ""
                            }`}
                            title={val !== "-" ? `${d}: ${statusLabel(val)}` : d}
                          >
                            <span className={`font-bold ${statusTextClass(val)}`}>
                              {val}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {pageRows.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No students match the current filter or search.
                </p>
              )}
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pageCount - 1}
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
