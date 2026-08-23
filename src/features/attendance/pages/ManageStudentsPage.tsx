import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Trash2, FileUp, Download, AlertOctagon, UserPlus, GraduationCap, KeyRound, Hash, ScanFace, SmilePlus } from "lucide-react";
import toast from "@/shared/lib/toast";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { adminApi } from "@/features/admin/api/admin";
import { SESSION_OPTIONS, getCurrentSession } from "@/features/attendance/constants";
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
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Modal } from "@/shared/components/ui/Modal";
import { cn, downloadBlob, getErrorMessage, jsonToCsv } from "@/shared/lib/utils";
import type { RosterStudent } from "@/features/attendance/types";
import type { CreateStudentRequest } from "@/features/admin/types";

const RELATION_OPTIONS: { value: NonNullable<CreateStudentRequest["guardian_relation"]>; label: string }[] = [
  { value: "guardian", label: "Guardian" },
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "other", label: "Other" },
];

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
  const [session, setSession] = useState(getCurrentSession());
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [search, setSearch] = useState("");
  const [missingFaceOnly, setMissingFaceOnly] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<RosterStudent | null>(
    null,
  );
  const [studentDeleteMode, setStudentDeleteMode] = useState<DeleteMode>("full");
  const [classDeleteOpen, setClassDeleteOpen] = useState(false);
  const [classDeleteMode, setClassDeleteMode] = useState<DeleteMode>("full");
  const [classDeleteConfirmText, setClassDeleteConfirmText] = useState("");

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newRollNo, setNewRollNo] = useState("");
  const [newClassRollNo, setNewClassRollNo] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newGuardianName, setNewGuardianName] = useState("");
  const [newGuardianMobile, setNewGuardianMobile] = useState("");
  const [newGuardianRelation, setNewGuardianRelation] =
    useState<CreateStudentRequest["guardian_relation"]>("guardian");

  const [studentToSetRollNo, setStudentToSetRollNo] = useState<RosterStudent | null>(null);
  const [rollNoInput, setRollNoInput] = useState("");

  const [studentToPromote, setStudentToPromote] = useState<RosterStudent | null>(null);
  const [promoteTargetClass, setPromoteTargetClass] = useState("");
  const [promoteTargetSection, setPromoteTargetSection] = useState("");
  const [promoteTargetSession, setPromoteTargetSession] = useState("");

  const [classPromoteOpen, setClassPromoteOpen] = useState(false);
  const [classPromoteTargetSession, setClassPromoteTargetSession] = useState("");

  const [studentToResetPassword, setStudentToResetPassword] =
    useState<RosterStudent | null>(null);

  const [studentToAddFace, setStudentToAddFace] = useState<RosterStudent | null>(null);
  const [addFacePhotos, setAddFacePhotos] = useState<File[]>([]);

  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = className ? getSectionOptions(className) : [];

  // Reset the class picker and any loaded roster when the active school changes.
  useEffect(() => {
    setClassName("");
    setSection("");
    setRoster(null);
    setMissingFaceOnly(false);
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

  const addStudentMutation = useMutation({
    mutationFn: () => {
      if (!schoolId) throw new Error("No school selected");
      return adminApi.createStudent(schoolId, {
        full_name: newFullName.trim() || undefined,
        roll_no: newRollNo.trim(),
        class_name: className,
        section: section || undefined,
        session,
        dob: newDob || undefined,
        guardian_name: newGuardianName.trim() || undefined,
        guardian_mobile: newGuardianMobile.trim() || undefined,
        guardian_relation: newGuardianMobile.trim() ? newGuardianRelation : undefined,
        class_roll_no: newClassRollNo.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success(res.message ?? "Student account created");
      setAddStudentOpen(false);
      setNewFullName("");
      setNewRollNo("");
      setNewClassRollNo("");
      setNewDob("");
      setNewGuardianName("");
      setNewGuardianMobile("");
      setNewGuardianRelation("guardian");
      if (className && section) loadMutation.mutate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const setRollNoMutation = useMutation({
    mutationFn: () => {
      if (!schoolId || !studentToSetRollNo) throw new Error("No student selected");
      return adminApi.setStudentClassRollNo(schoolId, studentToSetRollNo.roll_no, {
        class_roll_no: rollNoInput.trim() || null,
      });
    },
    onSuccess: (res) => {
      if (res.conflict_with) {
        toast.warning(res.message);
      } else {
        toast.success(res.message);
      }
      setRoster((prev) =>
        prev?.map((s) =>
          s.roll_no === res.roll_no ? { ...s, class_roll_no: res.class_roll_no } : s,
        ) ?? null,
      );
      setStudentToSetRollNo(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const promoteStudentMutation = useMutation({
    mutationFn: () => {
      if (!schoolId || !studentToPromote) throw new Error("No student selected");
      return adminApi.promoteStudent(schoolId, studentToPromote.roll_no, {
        target_class: promoteTargetClass.trim() || undefined,
        target_section: promoteTargetSection.trim() || undefined,
        target_session: promoteTargetSession.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success(
        res.status === "passed_out"
          ? `${studentToPromote?.name ?? studentToPromote?.roll_no} marked as passed out`
          : `Promoted to ${res.class_name ?? "next class"}${res.section ? `-${res.section}` : ""} · ${res.session ?? ""}`,
      );
      setRoster((prev) => prev?.filter((s) => s.roll_no !== studentToPromote?.roll_no) ?? null);
      setStudentToPromote(null);
      setPromoteTargetClass("");
      setPromoteTargetSection("");
      setPromoteTargetSession("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => {
      if (!schoolId || !studentToResetPassword) throw new Error("No student selected");
      return adminApi.resetStudentPassword(schoolId, studentToResetPassword.roll_no);
    },
    onSuccess: (res) => {
      toast.success(res.message ?? "Password reset");
      setStudentToResetPassword(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const addFaceMutation = useMutation({
    mutationFn: () => {
      if (!studentToAddFace || addFacePhotos.length === 0) {
        throw new Error("Select at least one photo");
      }
      return attendanceApi.enrollStudentFace(studentToAddFace.roll_no, addFacePhotos, {
        session,
        ...schoolParam,
      });
    },
    onSuccess: (res) => {
      toast.success(
        res.enrolled_students.length > 0
          ? `Face attached for ${res.enrolled_students[0].name}`
          : "Face attached",
      );
      const rollNo = studentToAddFace?.roll_no;
      setRoster((prev) =>
        prev?.map((s) => (s.roll_no === rollNo ? { ...s, has_face: true } : s)) ?? null,
      );
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setStudentToAddFace(null);
      setAddFacePhotos([]);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const classPromoteMutation = useMutation({
    mutationFn: () => {
      if (!schoolId) throw new Error("No school selected");
      return adminApi.promoteClass(schoolId, {
        class_name: className,
        section: section || undefined,
        session,
        target_session: classPromoteTargetSession.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success(`Promoted ${res.promoted} student(s)${res.passed_out ? `, ${res.passed_out} passed out` : ""}`);
      setRoster(null);
      setClassPromoteOpen(false);
      setClassPromoteTargetSession("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleExportCSV = () => {
    if (!visible || visible.length === 0) return;
    const csvContent = jsonToCsv(visible, [
      { header: "Admission No", getValue: (s) => String(s.roll_no) },
      { header: "Class Roll No", getValue: (s) => String(s.class_roll_no ?? "") },
      { header: "Name", getValue: (s) => String(s.name ?? "—") },
      { header: "Has Face", getValue: (s) => (s.has_face ? "Yes" : "No") },
    ]);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `students${className ? `-${className}${section ? `-${section}` : ""}` : ""}.csv`);
  };

  // Server-streamed export across every class in the school (the backend
  // supports omitting class/section entirely) — distinct from "Export CSV"
  // above, which is a quick client-side export of the one class/section
  // currently loaded. Only admin/principal may omit class_name; a teacher's
  // read access is always scoped to one assigned class (check_attendance_read_access).
  const exportRosterMutation = useMutation({
    mutationFn: () => attendanceApi.viewStudents({ ...schoolParam }),
    onSuccess: (blob) => {
      downloadBlob(blob, `${schoolName ? `${schoolName}-` : ""}full-roster.csv`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const canLoad = !!className && !!section && (!isAdmin || !!schoolName);
  const classLabel = `${className}${section ? `-${section}` : ""}`;
  const classDeleteConfirmed = classDeleteConfirmText.trim() === classLabel;

  const missingFaceCount = useMemo(
    () => roster?.filter((s) => !s.has_face).length ?? 0,
    [roster],
  );

  const visible = useMemo(() => {
    if (!roster) return [];
    let out = roster;
    if (missingFaceOnly) out = out.filter((s) => !s.has_face);
    const q = search.trim().toLowerCase();
    if (!q) return out;
    return out.filter(
      (s) =>
        s.roll_no.toLowerCase().includes(q) ||
        (s.class_roll_no ?? "").toLowerCase().includes(q) ||
        (s.name ?? "").toLowerCase().includes(q),
    );
  }, [roster, search, missingFaceOnly]);

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
          icon={<UserPlus className="h-4 w-4" />}
          disabled={!canLoad}
          onClick={() => setAddStudentOpen(true)}
        >
          Add Student
        </Button>
        <Button
          size="sm"
          variant="outline"
          icon={<Download className="h-4 w-4" />}
          disabled={!schoolId || (isAdmin && !schoolName) || visible.length === 0}
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
        {canImport && (
          <Button
            size="sm"
            variant="outline"
            icon={<Download className="h-4 w-4" />}
            loading={exportRosterMutation.isPending}
            disabled={!schoolId || (isAdmin && !schoolName)}
            onClick={() => exportRosterMutation.mutate()}
          >
            Export Full Roster
          </Button>
        )}
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
              {missingFaceCount > 0 && (
                <button
                  type="button"
                  onClick={() => setMissingFaceOnly((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    missingFaceOnly
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground",
                  )}
                  title="Toggle: show only students missing a face"
                >
                  <ScanFace className="h-3.5 w-3.5" />
                  {missingFaceCount} missing face
                </button>
              )}
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search roll or name…"
                className="w-full sm:w-56"
              />
              {missingFaceCount > 0 && (
                <Button asChild size="sm" variant="outline" icon={<SmilePlus className="h-4 w-4" />}>
                  <Link to="/attendance/enroll">Enroll Faces</Link>
                </Button>
              )}
              {roster.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<GraduationCap className="h-4 w-4" />}
                  onClick={() => {
                    setClassPromoteTargetSession("");
                    setClassPromoteOpen(true);
                  }}
                >
                  Promote this class
                </Button>
              )}
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
                title={
                  roster.length === 0
                    ? "No students in this class yet"
                    : "No students match your search"
                }
                description={
                  roster.length === 0
                    ? canImport
                      ? "Import a roster CSV or add students one at a time."
                      : "Ask an admin to import this class's roster."
                    : "Try a different roll number or name."
                }
                action={
                  roster.length === 0 && canImport ? (
                    <Button asChild size="sm" variant="outline" icon={<FileUp className="h-4 w-4" />}>
                      <Link to="/students/import">Import Students</Link>
                    </Button>
                  ) : undefined
                }
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
                        {s.class_roll_no && (
                          <span className="font-medium text-foreground">Roll {s.class_roll_no} · </span>
                        )}
                        Admission No. {s.roll_no}
                      </p>
                    </div>
                    {!s.has_face && (
                      <Badge variant="warning" className="shrink-0 gap-1">
                        <ScanFace className="h-3 w-3" />
                        No face
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    {!s.has_face && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAddFacePhotos([]);
                          setStudentToAddFace(s);
                        }}
                        icon={<ScanFace className="h-4 w-4" />}
                      >
                        Add Face
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRollNoInput(s.class_roll_no ?? "");
                        setStudentToSetRollNo(s);
                      }}
                      icon={<Hash className="h-4 w-4" />}
                    >
                      Set Roll No.
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPromoteTargetClass("");
                        setPromoteTargetSection("");
                        setPromoteTargetSession("");
                        setStudentToPromote(s);
                      }}
                      icon={<GraduationCap className="h-4 w-4" />}
                    >
                      Promote
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStudentToResetPassword(s)}
                      icon={<KeyRound className="h-4 w-4" />}
                    >
                      Reset Password
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-ghost"
                      onClick={() => {
                        setStudentDeleteMode("full");
                        setStudentToDelete(s);
                      }}
                      icon={<Trash2 className="h-4 w-4" />}
                    >
                      Delete
                    </Button>
                  </div>
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
            (Admission #{studentToDelete?.roll_no}). This cannot be undone.
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
        open={studentToResetPassword !== null}
        onClose={() => setStudentToResetPassword(null)}
        title="Reset student password?"
        icon={<KeyRound className="h-4 w-4" />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setStudentToResetPassword(null)}>
              Cancel
            </Button>
            <Button
              loading={resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate()}
            >
              Reset Password
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Resets the password for{" "}
          <span className="font-medium text-foreground">
            {studentToResetPassword?.name ?? studentToResetPassword?.roll_no}
          </span>{" "}
          (Admission #{studentToResetPassword?.roll_no}) to their date of birth
          (DDMMYYYY) and signs them out everywhere. Requires a date of birth on
          file — add one via the roster import if this fails.
        </p>
      </Modal>

      <Modal
        open={studentToAddFace !== null}
        onClose={() => {
          setStudentToAddFace(null);
          setAddFacePhotos([]);
        }}
        title="Add face"
        icon={<ScanFace className="h-4 w-4" />}
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setStudentToAddFace(null);
                setAddFacePhotos([]);
              }}
            >
              Cancel
            </Button>
            <Button
              loading={addFaceMutation.isPending}
              disabled={addFacePhotos.length === 0}
              onClick={() => addFaceMutation.mutate()}
            >
              Attach Face
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Attach a face for{" "}
            <span className="font-medium text-foreground">
              {studentToAddFace?.name ?? studentToAddFace?.roll_no}
            </span>{" "}
            (Admission #{studentToAddFace?.roll_no}). Any filenames are fine —
            matching is by roll number, not the photo name.
          </p>
          <FileUpload
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            multiple
            maxSize={15 * 1024 * 1024}
            hint="1-5 clear, front-facing photos work best. Max 15 MB each."
            onChange={setAddFacePhotos}
          />
        </div>
      </Modal>

      <Modal
        open={studentToSetRollNo !== null}
        onClose={() => setStudentToSetRollNo(null)}
        title="Set roll number"
        icon={<Hash className="h-4 w-4" />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setStudentToSetRollNo(null)}>
              Cancel
            </Button>
            <Button
              loading={setRollNoMutation.isPending}
              onClick={() => setRollNoMutation.mutate()}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sets this year's class roll number for{" "}
            <span className="font-medium text-foreground">
              {studentToSetRollNo?.name ?? studentToSetRollNo?.roll_no}
            </span>{" "}
            (Admission #{studentToSetRollNo?.roll_no}) — the number you call
            out for roll-call. Separate from their admission number, and not
            checked for uniqueness — double-check the class list yourself.
            Leave blank to clear it.
          </p>
          <Input
            label="Class Roll No."
            placeholder="22"
            value={rollNoInput}
            onChange={(e) => setRollNoInput(e.target.value)}
            autoFocus
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

      <Modal
        open={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        title="Add Student"
        icon={<UserPlus className="h-4 w-4" />}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddStudentOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={addStudentMutation.isPending}
              disabled={!newRollNo.trim()}
              onClick={() => addStudentMutation.mutate()}
            >
              Create Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Creates a login account for{" "}
            <span className="font-medium text-foreground">
              Class {className}{section ? `-${section}` : ""} · {session}
            </span>{" "}
            and links it to a roll number in one step — no email needed. The
            student's default password is their date of birth (DDMMYYYY); a
            guardian mobile, if given, is linked as an approved parent account
            automatically.
          </p>
          <Input
            label="Full Name"
            placeholder="Student's name"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Admission Number"
              hint="Permanent — used for login, never changes"
              placeholder="2026-10A-001"
              value={newRollNo}
              onChange={(e) => setNewRollNo(e.target.value)}
            />
            <Input
              label="Class Roll No. (optional)"
              hint="This year's roll number"
              placeholder="22"
              value={newClassRollNo}
              onChange={(e) => setNewClassRollNo(e.target.value)}
            />
          </div>
          <Input
            label="Date of Birth"
            type="date"
            hint="Sets the initial password"
            value={newDob}
            onChange={(e) => setNewDob(e.target.value)}
          />

          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Parent / guardian (optional)
            </p>
            <div className="space-y-4">
              <Input
                label="Guardian Name"
                placeholder="Parent's name"
                value={newGuardianName}
                onChange={(e) => setNewGuardianName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Guardian Mobile"
                  type="tel"
                  placeholder="9876543210"
                  hint="Becomes the parent's login"
                  value={newGuardianMobile}
                  onChange={(e) => setNewGuardianMobile(e.target.value)}
                />
                <Select
                  label="Relation"
                  options={RELATION_OPTIONS}
                  value={newGuardianRelation}
                  onChange={(e) =>
                    setNewGuardianRelation(
                      e.target.value as CreateStudentRequest["guardian_relation"],
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={studentToPromote !== null}
        onClose={() => setStudentToPromote(null)}
        title="Promote student"
        icon={<GraduationCap className="h-4 w-4" />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setStudentToPromote(null)}>
              Cancel
            </Button>
            <Button
              loading={promoteStudentMutation.isPending}
              onClick={() => promoteStudentMutation.mutate()}
            >
              Promote
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Promotes{" "}
            <span className="font-medium text-foreground">
              {studentToPromote?.name ?? studentToPromote?.roll_no}
            </span>{" "}
            (Admission #{studentToPromote?.roll_no}) to the next class and session.
            Leave the fields below empty to use the auto-suggested class/section/session,
            or override them explicitly. If this is the school's terminal class, the
            student is marked passed out instead.
          </p>
          <Input
            label="Target Class (optional)"
            placeholder="Auto-suggested"
            value={promoteTargetClass}
            onChange={(e) => setPromoteTargetClass(e.target.value)}
          />
          <Input
            label="Target Section (optional)"
            placeholder="Auto-suggested"
            value={promoteTargetSection}
            onChange={(e) => setPromoteTargetSection(e.target.value)}
          />
          <Input
            label="Target Session (optional)"
            placeholder="Auto-suggested"
            value={promoteTargetSession}
            onChange={(e) => setPromoteTargetSession(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={classPromoteOpen}
        onClose={() => setClassPromoteOpen(false)}
        title="Promote this class?"
        icon={<GraduationCap className="h-4 w-4" />}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setClassPromoteOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={classPromoteMutation.isPending}
              onClick={() => classPromoteMutation.mutate()}
            >
              Promote class
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Promotes every active student in{" "}
            <span className="font-medium text-foreground">
              Class {classLabel} · {session}
            </span>{" "}
            to the next class/session. Students in the school's terminal class are
            marked passed out instead.
          </p>
          <Input
            label="Target Session (optional)"
            placeholder="Auto-suggested"
            value={classPromoteTargetSession}
            onChange={(e) => setClassPromoteTargetSession(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
