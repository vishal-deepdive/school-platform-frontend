import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Trash2, FileUp, Download, AlertOctagon } from "lucide-react";
import toast from "@/shared/lib/toast";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { useAuthStore } from "@/features/auth/store/auth";
import { isSchoolAdmin } from "@/shared/lib/permissions";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { Avatar } from "@/shared/components/ui/Avatar";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Modal } from "@/shared/components/ui/Modal";
import { downloadBlob, getErrorMessage, jsonToCsv } from "@/shared/lib/utils";
import type { RosterStudent } from "@/features/attendance/types";

type DeleteMode = "full" | "database" | "attendance";

const DELETE_MODE_OPTIONS: { value: DeleteMode; label: string }[] = [
  { value: "full", label: "Full delete — profile and attendance history" },
  { value: "database", label: "Profile only — keep attendance history" },
  { value: "attendance", label: "Attendance logs only — keep profile" },
];

const DELETE_MODE_CONSEQUENCE: Record<DeleteMode, string> = {
  full: "permanently deletes their profile and every attendance record",
  database: "removes their registration profile but keeps their historical attendance records",
  attendance: "wipes their attendance records but keeps their registration profile",
};

const DELETE_MODE_STUDENT_TOAST: Record<DeleteMode, (rollNo: string) => string> = {
  full: (rollNo) => `Student ${rollNo} deleted`,
  database: (rollNo) => `Profile removed for ${rollNo} — attendance history kept`,
  attendance: (rollNo) => `Attendance logs cleared for ${rollNo} — profile kept`,
};

const DELETE_MODE_CLASS_TOAST: Record<DeleteMode, (classLabel: string) => string> = {
  full: (classLabel) => `Class ${classLabel} deleted`,
  database: (classLabel) => `Profiles removed for class ${classLabel} — attendance history kept`,
  attendance: (classLabel) => `Attendance logs cleared for class ${classLabel} — profiles kept`,
};

export function ManageStudentsPage() {
  const { schoolId, schoolName, isAdmin, schoolParam } = useActiveSchool();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  // /students/import stays admin/principal-only — don't dead-end teachers here.
  const canImport = isSchoolAdmin(role);

  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [session, setSession] = useState("2025-26");
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [search, setSearch] = useState("");
  const [studentToDelete, setStudentToDelete] = useState<RosterStudent | null>(
    null,
  );
  const [studentDeleteMode, setStudentDeleteMode] = useState<DeleteMode>("full");
  const [classDeleteOpen, setClassDeleteOpen] = useState(false);
  const [classDeleteMode, setClassDeleteMode] = useState<DeleteMode>("full");
  const [classDeleteConfirmText, setClassDeleteConfirmText] = useState("");

  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = className ? getSectionOptions(className) : [];

  // Reset the class picker and any loaded roster when the active school changes.
  useEffect(() => {
    setClassName("");
    setSection("");
    setRoster(null);
  }, [schoolId]);

  const loadMutation = useMutation({
    mutationFn: () =>
      attendanceApi.getRoster({
        class_name: className,
        section,
        session,
        ...schoolParam,
      }),
    onSuccess: (data) => setRoster(data.students),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ rollNo, mode }: { rollNo: string; mode: DeleteMode }) => {
      const params = { roll_no: rollNo, session, ...schoolParam };
      if (mode === "database") return attendanceApi.deleteStudentFromDatabase(params);
      if (mode === "attendance") return attendanceApi.deleteStudentFromAttendance(params);
      return attendanceApi.deleteStudent(params);
    },
    onSuccess: (_res, { rollNo, mode }) => {
      setRoster((prev) => prev?.filter((s) => s.roll_no !== rollNo) ?? null);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(DELETE_MODE_STUDENT_TOAST[mode](rollNo));
      setStudentToDelete(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const classDeleteMutation = useMutation({
    mutationFn: (mode: DeleteMode) => {
      const params = { class_name: className, section, session, ...schoolParam };
      if (mode === "database") return attendanceApi.deleteBulkFromDatabase(params);
      if (mode === "attendance") return attendanceApi.deleteBulkFromAttendance(params);
      return attendanceApi.deleteClass(params);
    },
    onSuccess: (_res, mode) => {
      setRoster(null);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(DELETE_MODE_CLASS_TOAST[mode](classLabel));
      setClassDeleteOpen(false);
      setClassDeleteConfirmText("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleExportCSV = () => {
    if (!visible || visible.length === 0) return;
    const csvContent = jsonToCsv(visible, [
      { header: "Roll No", getValue: (s) => String(s.roll_no) },
      { header: "Name", getValue: (s) => String(s.name ?? "—") },
    ]);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `students${className ? `-${className}${section ? `-${section}` : ""}` : ""}.csv`);
  };

  const canLoad = !!className && !!section && (!isAdmin || !!schoolName);
  const classLabel = `${className}${section ? `-${section}` : ""}`;
  const classDeleteConfirmed = classDeleteConfirmText.trim() === classLabel;

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

  return (
    <div className="space-y-6">
      <ModuleHeaderActions>
        {canImport && (
          <Button asChild size="sm" variant="outline">
            <Link to="/students/import">
              <FileUp className="h-4 w-4" />
              Import Students
            </Link>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          icon={<Download className="h-4 w-4" />}
          disabled={!schoolId || (isAdmin && !schoolName) || visible.length === 0}
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
      </ModuleHeaderActions>
      <FilterBar
        title="Find a class"
        icon={<Users className="h-4 w-4" />}
        actions={
          <Button
            onClick={() => loadMutation.mutate()}
            loading={loadMutation.isPending}
            disabled={!canLoad}
            icon={<Users className="h-4 w-4" />}
          >
            Load Students
          </Button>
        }
      >
        <Alert variant="warning" title="Destructive actions">
          Deletions are permanent and audit-logged. Double-check the roll number
          before removing a student.
        </Alert>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Class"
            placeholder="Select class"
            options={classNameOptions}
            value={className}
            disabled={!schoolId}
            onChange={(e) => {
              setClassName(e.target.value);
              setSection("");
              setRoster(null);
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
          <Select
            label="Session"
            options={SESSION_OPTIONS}
            value={session}
            onChange={(e) => setSession(e.target.value)}
          />
        </div>
      </FilterBar>

      {roster && (
        <Panel
          flush
          icon={<Users className="h-4 w-4" />}
          title="Enrolled students"
          description={
            className && section ? `Class ${className}-${section}` : undefined
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">{roster.length} enrolled</Badge>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search roll or name…"
                className="w-full sm:w-56"
              />
              {roster.length > 0 && (
                <Button
                  size="sm"
                  variant="danger-ghost"
                  icon={<AlertOctagon className="h-4 w-4" />}
                  onClick={() => {
                    setClassDeleteMode("full");
                    setClassDeleteConfirmText("");
                    setClassDeleteOpen(true);
                  }}
                >
                  Delete this class
                </Button>
              )}
            </div>
          }
        >
          {visible.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Users className="h-9 w-9" />}
                title="No students match your search"
                description="Try a different roll number or name."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {visible.map((s) => (
                <li
                  key={s.roll_no}
                  className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={s.name ?? s.roll_no} seed={s.roll_no} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.name ?? s.roll_no}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Roll #{s.roll_no}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    onClick={() => {
                      setStudentDeleteMode("full");
                      setStudentToDelete(s);
                    }}
                    icon={<Trash2 className="h-4 w-4" />}
                    className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Modal
        open={studentToDelete !== null}
        onClose={() => setStudentToDelete(null)}
        title="Delete student?"
        icon={<AlertOctagon className="h-4 w-4" />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setStudentToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() =>
                studentToDelete &&
                deleteMutation.mutate({
                  rollNo: studentToDelete.roll_no,
                  mode: studentDeleteMode,
                })
              }
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This {DELETE_MODE_CONSEQUENCE[studentDeleteMode]} for{" "}
            <span className="font-medium text-foreground">
              {studentToDelete?.name ?? studentToDelete?.roll_no}
            </span>{" "}
            (Roll #{studentToDelete?.roll_no}). This cannot be undone.
          </p>
          <Select
            label="What to delete"
            options={DELETE_MODE_OPTIONS}
            value={studentDeleteMode}
            onChange={(e) => setStudentDeleteMode(e.target.value as DeleteMode)}
          />
        </div>
      </Modal>

      <Modal
        open={classDeleteOpen}
        onClose={() => setClassDeleteOpen(false)}
        title="Delete this class?"
        icon={<AlertOctagon className="h-4 w-4" />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setClassDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={classDeleteMutation.isPending}
              disabled={!classDeleteConfirmed}
              onClick={() => classDeleteMutation.mutate(classDeleteMode)}
            >
              Delete class
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This {DELETE_MODE_CONSEQUENCE[classDeleteMode]} for{" "}
            <span className="font-medium text-foreground">every student</span> in{" "}
            <span className="font-medium text-foreground">
              Class {classLabel} · {session}
            </span>
            . This cannot be undone.
          </p>
          <Select
            label="What to delete"
            options={DELETE_MODE_OPTIONS}
            value={classDeleteMode}
            onChange={(e) => setClassDeleteMode(e.target.value as DeleteMode)}
          />
          <Input
            label={`Type "${classLabel}" to confirm`}
            value={classDeleteConfirmText}
            onChange={(e) => setClassDeleteConfirmText(e.target.value)}
            placeholder={classLabel}
          />
        </div>
      </Modal>
    </div>
  );
}
