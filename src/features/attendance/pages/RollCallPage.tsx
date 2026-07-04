import { useAuthStore } from "@/features/auth/store/auth";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Users, UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { usePersistedState } from "@/shared/hooks/usePersistedState";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import { isHolidayDate } from "@/features/attendance/lib/holidays";
import { STATUS_LABELS } from "@/features/attendance/lib/status";
import { getErrorMessage, isoToIndianDate, isSunday } from "@/shared/lib/utils";
import { StatCard } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { Panel } from "@/shared/components/ui/Panel";
import { Avatar } from "@/shared/components/ui/Avatar";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import type {
  AttendanceStatus,
  RosterStudent,
} from "@/features/attendance/types";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Status order shown on each student's toggle row. Present/Absent are the common
// taps; Late/Excused/Half-day cover the rest without leaving the grid.
const STATUSES: AttendanceStatus[] = ["P", "A", "L", "E", "H"];

// Active-state colour per status (inactive buttons stay neutral/outlined).
const ACTIVE_CLASSES: Record<AttendanceStatus, string> = {
  P: "bg-green-600 text-white border-green-600 shadow-sm",
  A: "bg-red-500 text-white border-red-500 shadow-sm",
  L: "bg-amber-500 text-white border-amber-500 shadow-sm",
  E: "bg-blue-500 text-white border-blue-500 shadow-sm",
  H: "bg-muted-foreground text-white border-muted-foreground shadow-sm",
};

export function RollCallPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [schoolId, setSchoolId] = useState<string | undefined>(
    isAdmin ? undefined : user?.school_id ?? undefined,
  );
  const [schoolName, setSchoolName] = useState<string>("");
  // Persist the teacher's class/section/session — they mark the same class daily.
  const [className, setClassName] = usePersistedState("att.rollcall.class", "");
  const [section, setSection] = usePersistedState("att.rollcall.section", "");
  const [subject, setSubject] = useState("");
  const [session, setSession] = usePersistedState("att.rollcall.session", "2025-26");
  const [date, setDate] = useState(todayIso());
  const [allowHoliday, setAllowHoliday] = useState(false);

  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [search, setSearch] = useState("");

  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isSearching: schoolsLoading,
  } = useSchoolSearch();
  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = className ? getSectionOptions(className) : [];

  const holidays = useHolidayDates({
    session,
    schoolName: schoolName || undefined,
    enabled: !isAdmin || !!schoolName,
  });
  const dateIsSunday = date ? isSunday(date) : false;
  const dateIsHoliday = date ? isHolidayDate(date, holidays) : false;

  // Selecting a different class/section/date invalidates a loaded roster so the
  // teacher can't accidentally save marks against the wrong slot.
  useEffect(() => {
    setRoster(null);
    setStatuses({});
  }, [schoolId, className, section, subject, session, date]);

  useEffect(() => {
    if (!dateIsHoliday) setAllowHoliday(false);
  }, [dateIsHoliday]);

  const handleSchoolChange = (id: string) => {
    setSchoolId(id);
    setClassName("");
    setSection("");
    setSchoolName(schoolOptions.find((o) => o.value === id)?.label ?? "");
  };

  const loadMutation = useMutation({
    mutationFn: () => {
      const params: Record<string, string> = {
        class_name: className,
        section,
        session,
        date: isoToIndianDate(date),
        ...(isAdmin && schoolName && { school_name: schoolName }),
        ...(subject && { subject }),
      };
      return attendanceApi.getRoster(params);
    },
    onSuccess: (data) => {
      setRoster(data.students);
      // Pre-fill from any existing marks; default unmarked students to Present
      // (mark-all-present-then-flag-absentees is the fastest real-world flow).
      const next: Record<string, AttendanceStatus> = {};
      for (const s of data.students) next[s.roll_no] = s.status ?? "P";
      setStatuses(next);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!roster) return Promise.reject(new Error("Load a class first"));
      return attendanceApi.markManual({
        class_name: className,
        section,
        session,
        attendance_date: isoToIndianDate(date),
        allow_holiday: allowHoliday || undefined,
        ...(isAdmin && schoolName && { school_name: schoolName }),
        ...(subject && { subject }),
        records: roster.map((s) => ({
          roll_no: s.roll_no,
          status: statuses[s.roll_no] ?? "A",
        })),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(`Attendance saved for ${data.total_marked} students`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const setStatus = (rollNo: string, status: AttendanceStatus) =>
    setStatuses((prev) => ({ ...prev, [rollNo]: status }));

  const setAll = (status: AttendanceStatus) => {
    if (!roster) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const s of roster) next[s.roll_no] = status;
    setStatuses(next);
  };

  const canLoad = !!className && !!section && (!isAdmin || !!schoolName);

  const visible = useMemo(() => {
    if (!roster) return [];
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (s) =>
        s.roll_no.toLowerCase().includes(q) ||
        (s.name ?? "").toLowerCase().includes(q),
    );
  }, [roster, search]);

  const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { P: 0, A: 0, L: 0, E: 0, H: 0 };
    for (const st of Object.values(statuses)) c[st] += 1;
    return c;
  }, [statuses]);

  return (
    <div className="space-y-6">
      <FilterBar
        title="Class & date"
        actions={
          <Button
            onClick={() => loadMutation.mutate()}
            loading={loadMutation.isPending}
            disabled={!canLoad}
            icon={<Users className="h-4 w-4" />}
          >
            {loadMutation.isPending ? "Loading…" : "Load Class"}
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
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
            label="Class"
            placeholder={schoolId ? "Select class" : "Select a school first"}
            options={classNameOptions}
            value={className}
            disabled={isAdmin && !schoolId}
            onChange={(e) => {
              setClassName(e.target.value);
              setSection("");
            }}
          />
          {sectionOptions.length > 0 ? (
            <Select
              label="Section"
              placeholder="Select section"
              options={sectionOptions}
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          ) : (
            <Input
              label="Section"
              placeholder="A"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          )}
          <Input
            label="Subject (optional)"
            placeholder="Mathematics"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
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

        {dateIsHoliday && (
          <Alert
            variant="warning"
            title={dateIsSunday ? "This date is a Sunday" : "This date is a school holiday"}
          >
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={allowHoliday}
                onChange={(e) => setAllowHoliday(e.target.checked)}
              />
              Mark attendance anyway (holiday override)
            </label>
          </Alert>
        )}
      </FilterBar>

      {roster && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Present"
              value={counts.P}
              icon={<UserCheck className="h-5 w-5" />}
              color="success"
            />
            <StatCard
              label="Absent"
              value={counts.A}
              icon={<UserX className="h-5 w-5" />}
              color="danger"
            />
            <StatCard label="Late" value={counts.L} color="warning" />
            <StatCard label="Excused" value={counts.E} color="info" />
            <StatCard label="Half Day" value={counts.H} />
          </div>

          <Panel
            flush
            icon={<CheckSquare className="h-4 w-4" />}
            title="Mark students"
            description={`${roster.length} student${roster.length === 1 ? "" : "s"} in this class`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setAll("P")}>
                  All Present
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setAll("A")}>
                  All Absent
                </Button>
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search roll or name…"
                  className="w-full sm:w-56"
                />
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    icon={<Users className="h-9 w-9" />}
                    title="No students match your search"
                    description="Try a different roll number or name."
                  />
                </div>
              ) : (
                visible.map((s) => {
                  const current = statuses[s.roll_no] ?? "P";
                  return (
                    <div
                      key={s.roll_no}
                      className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-3 transition-colors hover:border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name ?? s.roll_no} seed={s.roll_no} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {s.name ?? s.roll_no}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Roll #{s.roll_no}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {STATUSES.map((st) => {
                          const active = current === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setStatus(s.roll_no, st)}
                              aria-pressed={active}
                              aria-label={`${STATUS_LABELS[st]} for ${s.name ?? s.roll_no}`}
                              title={STATUS_LABELS[st]}
                              className={`flex-1 rounded-lg border px-0 py-1.5 text-sm font-semibold transition-all ${
                                active
                                  ? ACTIVE_CLASSES[st]
                                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {counts.P}
                </span>{" "}
                present ·{" "}
                <span className="font-semibold text-red-500 dark:text-red-400">
                  {counts.A}
                </span>{" "}
                absent · {roster.length} total
              </p>
              <Button
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                icon={<CheckSquare className="h-4 w-4" />}
              >
                {saveMutation.isPending ? "Saving…" : "Save Attendance"}
              </Button>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
