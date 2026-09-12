import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckSquare, ScanFace, Users } from "lucide-react";
import toast from "@/shared/lib/toast";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS, getCurrentSession } from "@/features/attendance/constants";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { usePersistedState } from "@/shared/hooks/usePersistedState";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import { isHolidayDate } from "@/features/attendance/lib/holidays";
import { STATUS_LABELS } from "@/features/attendance/lib/status";
import { getErrorMessage, isoToIndianDate, isSunday } from "@/shared/lib/utils";
import { Alert } from "@/shared/components/ui/Alert";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { FormActions } from "@/shared/components/ui/FormActions";
import { Input } from "@/shared/components/ui/Input";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { RefreshButton } from "@/shared/components/ui/RefreshButton";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { Select } from "@/shared/components/ui/Select";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import type { AttendanceStatus, RosterStudent } from "@/features/attendance/types";

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

interface StudentRowProps {
  student: RosterStudent;
  currentStatus: AttendanceStatus;
  onStatusChange: (rollNo: string, status: AttendanceStatus) => void;
}

const StudentRow = memo(function StudentRow({
  student,
  currentStatus,
  onStatusChange,
}: StudentRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-3 transition-colors hover:border-border">
      <div className="flex items-center gap-3">
        <Avatar name={student.name ?? student.roll_no} seed={student.roll_no} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {student.name ?? student.roll_no}
          </p>
          <p className="text-xs text-muted-foreground">Roll #{student.roll_no}</p>
        </div>
        {!student.has_face && (
          <ScanFace
            className="h-4 w-4 shrink-0 text-amber-500"
            aria-label="No face on file — mark manually"
          />
        )}
      </div>
      <div className="flex gap-1">
        {STATUSES.map((st) => {
          const active = currentStatus === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => onStatusChange(student.roll_no, st)}
              aria-pressed={active}
              aria-label={`${STATUS_LABELS[st]} for ${student.name ?? student.roll_no}`}
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
});

export function RollCallPage() {
  const { schoolId, schoolName, isAdmin } = useActiveSchool();
  const queryClient = useQueryClient();

  // Persist the teacher's class/section/session — they mark the same class daily.
  const [className, setClassName] = usePersistedState("att.rollcall.class", "");
  const [section, setSection] = usePersistedState("att.rollcall.section", "");
  const [subject, setSubject] = useState("");
  const [session, setSession] = usePersistedState("att.rollcall.session", getCurrentSession());
  const [date, setDate] = useState(todayIso());
  const [allowHoliday, setAllowHoliday] = useState(false);

  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [search, setSearch] = useState("");

  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = className ? getSectionOptions(className) : [];

  const holidays = useHolidayDates({
    session,
    schoolName: schoolName || undefined,
    enabled: !isAdmin || !!schoolName,
  });
  const dateIsSunday = date ? isSunday(date) : false;
  const dateIsHoliday = date ? isHolidayDate(date, holidays) : false;

  // When an admin switches the active school, the persisted class/section may
  // not exist in the new school — clear them. Skip the initial mount so a
  // teacher's saved class isn't wiped on every page load.
  const prevSchoolId = useRef(schoolId);
  useEffect(() => {
    if (prevSchoolId.current !== schoolId) {
      prevSchoolId.current = schoolId;
      setClassName("");
      setSection("");
    }
  }, [schoolId, setClassName, setSection]);

  useEffect(() => {
    if (!dateIsHoliday) setAllowHoliday(false);
  }, [dateIsHoliday]);

  const canLoad = !!className && !!section && (!isAdmin || !!schoolName);

  // The class loads as soon as one is picked — no "Load class" step — and stays
  // cached, so flipping back to a class you already marked is instant.
  const rosterQuery = useQuery({
    queryKey: [
      "attendance",
      "rollcall-roster",
      schoolId ?? "",
      className,
      section,
      subject,
      session,
      date,
    ],
    queryFn: () =>
      attendanceApi.getRoster({
        class_name: className,
        section,
        session,
        date: isoToIndianDate(date),
        ...(isAdmin && schoolName ? { school_name: schoolName } : {}),
        ...(subject ? { subject } : {}),
      }),
    enabled: canLoad,
    staleTime: 30_000,
  });
  const roster = canLoad ? rosterQuery.data?.students : undefined;

  // Seed the toggles from whatever is already stored, defaulting the rest to
  // Present (mark-all-present-then-flag-absentees is the fastest real flow).
  // Keyed so a background refetch never discards marks in progress.
  const slotKey = `${schoolId}|${className}|${section}|${subject}|${session}|${date}`;
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    const students = rosterQuery.data?.students;
    if (!students || seededFor.current === slotKey) return;
    seededFor.current = slotKey;
    const next: Record<string, AttendanceStatus> = {};
    for (const s of students) next[s.roll_no] = s.status ?? "P";
    setStatuses(next);
  }, [rosterQuery.data, slotKey]);

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

  const setStatus = useCallback(
    (rollNo: string, status: AttendanceStatus) =>
      setStatuses((prev) => ({ ...prev, [rollNo]: status })),
    [],
  );

  const setAll = (status: AttendanceStatus) => {
    if (!roster) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const s of roster) next[s.roll_no] = status;
    setStatuses(next);
  };

  const visible = useMemo(() => {
    if (!roster) return [];
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (s) =>
        s.roll_no.toLowerCase().includes(q) || (s.name ?? "").toLowerCase().includes(q),
    );
  }, [roster, search]);

  const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { P: 0, A: 0, L: 0, E: 0, H: 0 };
    for (const st of Object.values(statuses)) c[st] += 1;
    return c;
  }, [statuses]);

  const changeClass = (value: string) => {
    const options = value ? getSectionOptions(value) : [];
    setClassName(value);
    setSection(options.length === 1 ? options[0].value : "");
  };

  return (
    <div className="space-y-4">
      <ModuleHeaderActions>
        <RefreshButton
          onClick={() => void rosterQuery.refetch()}
          refreshing={rosterQuery.isFetching && !rosterQuery.isLoading}
          label="Reload class"
        />
      </ModuleHeaderActions>

      <FilterBar title="Class & date" icon={<CalendarDays className="h-4 w-4" />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Select
            label="Class"
            placeholder="Select class"
            options={classNameOptions}
            value={className}
            disabled={!schoolId}
            onChange={(e) => changeClass(e.target.value)}
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
                className="h-4 w-4 rounded border-input accent-primary"
                checked={allowHoliday}
                onChange={(e) => setAllowHoliday(e.target.checked)}
              />
              Mark attendance anyway (holiday override)
            </label>
          </Alert>
        )}
      </FilterBar>

      {!canLoad ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title={isAdmin && !schoolName ? "Pick a school first" : "Choose a class"}
          description={
            isAdmin && !schoolName
              ? "Select the school you're marking for from the dashboard, then pick a class and section."
              : className
                ? "Pick a section — the class list loads right away."
                : "Pick a class and section — the class list loads right away."
          }
        />
      ) : rosterQuery.isError ? (
        <Alert variant="error">
          {getErrorMessage(rosterQuery.error) || "Failed to load this class."}
        </Alert>
      ) : (
        <>
          <Panel
            flush
            icon={<CheckSquare className="h-4 w-4" />}
            title="Mark students"
            description={
              roster
                ? `${roster.length} student${roster.length === 1 ? "" : "s"} · ${isoToIndianDate(date)}`
                : undefined
            }
            actions={
              roster && roster.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setAll("P")}>
                    All present
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setAll("A")}>
                    All absent
                  </Button>
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search roll or name…"
                    aria-label="Search this class"
                    className="w-full sm:w-56"
                  />
                </div>
              ) : undefined
            }
          >
            {rosterQuery.isLoading ? (
              <ListSkeleton items={6} />
            ) : visible.length === 0 ? (
              <EmptyState
                variant="plain"
                icon={<Users className="h-9 w-9" />}
                title={
                  (roster?.length ?? 0) === 0
                    ? "No students in this class yet"
                    : "No students match your search"
                }
                description={
                  (roster?.length ?? 0) === 0
                    ? "Import students for this class, then come back to mark attendance."
                    : "Try a different roll number or name."
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((s) => (
                  <StudentRow
                    key={s.roll_no}
                    student={s}
                    currentStatus={statuses[s.roll_no] ?? "P"}
                    onStatusChange={setStatus}
                  />
                ))}
              </div>
            )}
          </Panel>

          {roster && roster.length > 0 && (
            <FormActions
              info={
                <StatLine
                  items={[
                    { value: counts.P, label: "present", tone: "success" },
                    { value: counts.A, label: "absent", tone: "danger" },
                    { value: counts.L, label: "late", tone: "warning", hidden: !counts.L },
                    { value: counts.E, label: "excused", hidden: !counts.E },
                    { value: counts.H, label: "half day", hidden: !counts.H },
                    { value: roster.length, label: "in class" },
                  ]}
                />
              }
            >
              <Button
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                icon={<CheckSquare className="h-4 w-4" />}
              >
                {saveMutation.isPending ? "Saving…" : "Save attendance"}
              </Button>
            </FormActions>
          )}
        </>
      )}
    </div>
  );
}
