/**
 * Platform-admin School Detail — the single screen that surfaces every
 * previously-headless school operation: principal provisioning, class codes,
 * teacher-class assignments, RAG/chatbot access, and roll-number linkage, plus
 * staff invites and an activate/deactivate toggle. Each tab fetches its own
 * school-scoped data on mount.
 */
import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  UserCircle,
  KeyRound,
  Users as UsersIcon,
  BookOpen,
  IdCard,
  Plus,
  Copy,
  Trash2,
  Mail,
  Power,
  GraduationCap,
  Mic2,
  CalendarClock,
  CheckCircle2,
  Circle,
  Layers,
  Send,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { adminApi } from "@/features/admin/api/admin";
import { authApi, type PendingInvite } from "@/features/auth/api/auth";
import { getErrorMessage, formatDate } from "@/shared/lib/utils";
import { GRADE_OPTIONS, gradeRangeToClassNames } from "@/features/admin/constants";
import type {
  SchoolDetail,
  AdminUserListItem,
} from "@/features/admin/types";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Panel } from "@/shared/components/ui/Panel";
import { Modal, ModalFooter } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { StatCard } from "@/shared/components/ui/Card";
import { Tabs } from "@/shared/components/ui/Tabs";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { PageSkeleton, ListSkeleton } from "@/shared/components/ui/Skeleton";

// ── Small helpers ─────────────────────────────────────────────────────────────

function useActiveUsers(schoolId: string, role: string, enabled = true) {
  return useQuery({
    queryKey: ["admin", "school-users", schoolId, role],
    queryFn: () =>
      adminApi.listUsers({ school_id: schoolId, role, status: "active", limit: 200 }),
    enabled,
  });
}

function userLabel(u: AdminUserListItem): string {
  return u.full_name ? `${u.full_name} · ${u.email}` : u.email;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/50 py-2.5 last:border-0 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-sm font-medium text-muted-foreground sm:w-48">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

// ── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({ school }: { school: SchoolDetail }) {
  const address = [
    school.address_line_1,
    school.address_line_2,
    school.city,
    school.state,
    school.pin_code,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel title="Identity" icon={<Building2 className="h-4 w-4" />}>
        <dl>
          <InfoRow label="Name" value={school.name} />
          <InfoRow label="Code" value={school.code} />
          <InfoRow
            label="Board"
            value={school.board === "OTHER" ? school.other_board : school.board}
          />
          <InfoRow
            label="Type"
            value={
              school.school_type === "OTHER"
                ? school.other_school_type
                : school.school_type
            }
          />
          <InfoRow label="Established" value={school.established_year} />
          <InfoRow label="UDISE Code" value={school.udise_code} />
          <InfoRow label="Current Session" value={school.current_session} />
          <InfoRow label="Attendance Mode" value={school.attendance_mode} />
        </dl>
      </Panel>
      <Panel title="Contact & Academics" icon={<GraduationCap className="h-4 w-4" />}>
        <dl>
          <InfoRow label="Email" value={school.email} />
          <InfoRow label="Mobile" value={school.mobile} />
          <InfoRow label="Phone" value={school.phone} />
          <InfoRow label="Address" value={address || undefined} />
          <InfoRow label="Medium" value={school.medium_of_instruction} />
          <InfoRow
            label="Classes"
            value={
              school.classes_from && school.classes_to
                ? `Class ${school.classes_from} to ${school.classes_to}`
                : undefined
            }
          />
          <InfoRow
            label="Reported Students"
            value={school.student_count ?? undefined}
          />
        </dl>
      </Panel>
    </div>
  );
}

// ── Principal tab ─────────────────────────────────────────────────────────────

function PrincipalTab({ school }: { school: SchoolDetail }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const provision = useMutation({
    mutationFn: () =>
      adminApi.provisionPrincipal(school.id, {
        email: email.trim(),
        full_name: fullName.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(res.message ?? "Principal provisioned");
      queryClient.invalidateQueries({ queryKey: ["admin", "school", school.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
      setOpen(false);
      setEmail("");
      setFullName("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Panel
      title="Principal"
      icon={<UserCircle className="h-4 w-4" />}
      actions={
        !school.principal && (
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Provision Principal
          </Button>
        )
      }
    >
      {school.principal ? (
        <div className="flex items-center gap-3">
          <Avatar
            name={school.principal.full_name || school.principal.email}
            seed={school.principal.id}
            size="md"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {school.principal.full_name || "—"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {school.principal.email}
            </p>
          </div>
          <Badge
            variant={school.principal.account_status === "active" ? "success" : "warning"}
            className="ml-auto"
          >
            {school.principal.account_status}
          </Badge>
        </div>
      ) : (
        <EmptyState
          icon={<UserCircle className="h-10 w-10" />}
          title="No active principal"
          description="Provision a principal — they receive a set-password email to activate their account. Only one active principal is allowed per school."
        />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Provision Principal" size="sm">
        <div className="space-y-4">
          <Input
            label="Full Name"
            hint="Optional"
            placeholder="Principal Skinner"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            placeholder="principal@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => provision.mutate()}
            loading={provision.isPending}
            disabled={!email.trim()}
          >
            Send Invite
          </Button>
        </ModalFooter>
      </Modal>
    </Panel>
  );
}

// ── Class codes tab ───────────────────────────────────────────────────────────

function ClassCodesTab({
  schoolId,
  onBulk,
}: {
  schoolId: string;
  onBulk: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [session, setSession] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "class-codes", schoolId],
    queryFn: () => adminApi.listClassCodes(schoolId),
  });

  const create = useMutation({
    mutationFn: () =>
      adminApi.createClassCode(schoolId, {
        class_name: className.trim(),
        section: section.trim() || undefined,
        session: session.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Class code created");
      queryClient.invalidateQueries({ queryKey: ["admin", "class-codes", schoolId] });
      setOpen(false);
      setClassName("");
      setSection("");
      setSession("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast.success(`Copied ${code}`);
  };

  return (
    <Panel
      flush
      title="Class Codes"
      icon={<KeyRound className="h-4 w-4" />}
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Layers className="h-4 w-4" />}
            onClick={onBulk}
          >
            Bulk generate
          </Button>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            New Code
          </Button>
        </div>
      }
    >
      {error && (
        <div className="p-4">
          <Alert variant="error">{getErrorMessage(error)}</Alert>
        </div>
      )}
      {isLoading ? (
        <div className="p-4">
          <ListSkeleton items={3} />
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<KeyRound className="h-10 w-10" />}
            title="No class codes yet"
            description="Generate a code and share it with students to self-register into a class."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {data!.map((c) => (
            <li
              key={c.code}
              className="flex items-center justify-between gap-3 px-4 py-3 md:px-5"
            >
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => copy(c.code)}
                  className="inline-flex items-center gap-1.5 font-mono text-sm font-medium text-foreground hover:text-primary"
                  title="Copy code"
                >
                  {c.code}
                  <Copy className="h-3.5 w-3.5 opacity-60" />
                </button>
                <p className="truncate text-xs text-muted-foreground">
                  {c.class_name}
                  {c.section ? ` · Section ${c.section}` : ""}
                  {c.session ? ` · ${c.session}` : ""}
                </p>
              </div>
              <Badge variant={c.is_active ? "success" : "default"}>
                {c.is_active ? "Active" : "Inactive"}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create Class Code" size="sm">
        <div className="space-y-4">
          <Input
            label="Class / Subject"
            placeholder="Mathematics Grade 7"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <Input
            label="Section"
            hint="Optional"
            placeholder="A"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
          <Input
            label="Session"
            hint="Optional, e.g. 2025-26"
            placeholder="2025-26"
            value={session}
            onChange={(e) => setSession(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            loading={create.isPending}
            disabled={!className.trim()}
          >
            Create
          </Button>
        </ModalFooter>
      </Modal>
    </Panel>
  );
}

// ── Teachers tab ──────────────────────────────────────────────────────────────

function TeachersTab({ schoolId }: { schoolId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "teacher-assignments", schoolId],
    queryFn: () => adminApi.listTeacherAssignments(schoolId),
  });
  const teachers = useActiveUsers(schoolId, "teacher", open);

  const assign = useMutation({
    mutationFn: () =>
      adminApi.assignTeacher(schoolId, {
        teacher_id: teacherId,
        class_name: className.trim(),
        section: section.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Teacher assigned");
      queryClient.invalidateQueries({ queryKey: ["admin", "teacher-assignments", schoolId] });
      setOpen(false);
      setTeacherId("");
      setClassName("");
      setSection("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: (a: { teacher_id: string; class_name: string; section: string | null }) =>
      adminApi.revokeTeacherAssignment(schoolId, {
        teacher_id: a.teacher_id,
        class_name: a.class_name,
        section: a.section || undefined,
      }),
    onSuccess: () => {
      toast.success("Assignment revoked");
      queryClient.invalidateQueries({ queryKey: ["admin", "teacher-assignments", schoolId] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const teacherOptions = (teachers.data?.items ?? []).map((t) => ({
    value: t.id,
    label: userLabel(t),
  }));

  return (
    <Panel
      flush
      title="Teacher Assignments"
      icon={<UsersIcon className="h-4 w-4" />}
      actions={
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
          Assign Teacher
        </Button>
      }
    >
      {error && (
        <div className="p-4">
          <Alert variant="error">{getErrorMessage(error)}</Alert>
        </div>
      )}
      {isLoading ? (
        <div className="p-4">
          <ListSkeleton items={3} />
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<UsersIcon className="h-10 w-10" />}
            title="No teacher assignments"
            description="Assign teachers to the classes they manage so their attendance and lecture tools are scoped correctly."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {data!.map((a) => (
            <li
              key={a.id}
              className="group flex items-center justify-between gap-3 px-4 py-3 md:px-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {a.teacher_name || a.teacher_email || a.teacher_id}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.class_name}
                  {a.section ? ` · Section ${a.section}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                loading={
                  revoke.isPending &&
                  revoke.variables?.teacher_id === a.teacher_id &&
                  revoke.variables?.class_name === a.class_name
                }
                icon={<Trash2 className="h-4 w-4 text-destructive" />}
                onClick={() =>
                  revoke.mutate({
                    teacher_id: a.teacher_id,
                    class_name: a.class_name,
                    section: a.section,
                  })
                }
                className="text-destructive opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Assign Teacher to Class" size="sm">
        <div className="space-y-4">
          <Select
            label="Teacher"
            placeholder={teachers.isLoading ? "Loading teachers…" : "Select a teacher"}
            options={teacherOptions}
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          />
          {!teachers.isLoading && teacherOptions.length === 0 && (
            <Alert variant="info">
              This school has no active teachers yet. Invite one first.
            </Alert>
          )}
          <Input
            label="Class"
            placeholder="Grade 10"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <Input
            label="Section"
            hint="Optional"
            placeholder="A"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => assign.mutate()}
            loading={assign.isPending}
            disabled={!teacherId || !className.trim()}
          >
            Assign
          </Button>
        </ModalFooter>
      </Modal>
    </Panel>
  );
}

// ── RAG access tab ────────────────────────────────────────────────────────────

function RagAccessTab({ schoolId }: { schoolId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [userId, setUserId] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "rag-access", schoolId],
    queryFn: () => adminApi.listRagAccess(schoolId),
  });
  const users = useActiveUsers(schoolId, role, open);

  const grant = useMutation({
    mutationFn: () => adminApi.grantRagAccess(schoolId, userId),
    onSuccess: () => {
      toast.success("Access granted");
      queryClient.invalidateQueries({ queryKey: ["admin", "rag-access", schoolId] });
      setOpen(false);
      setUserId("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: (uid: string) => adminApi.revokeRagAccess(schoolId, uid),
    onSuccess: () => {
      toast.success("Access revoked");
      queryClient.invalidateQueries({ queryKey: ["admin", "rag-access", schoolId] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const userOptions = (users.data?.items ?? []).map((u) => ({
    value: u.id,
    label: userLabel(u),
  }));

  return (
    <Panel
      flush
      title="RAG / Chatbot Access"
      icon={<BookOpen className="h-4 w-4" />}
      actions={
        <Button
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setUserId("");
            setOpen(true);
          }}
        >
          Grant Access
        </Button>
      }
    >
      {error && (
        <div className="p-4">
          <Alert variant="error">{getErrorMessage(error)}</Alert>
        </div>
      )}
      {isLoading ? (
        <div className="p-4">
          <ListSkeleton items={3} />
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            title="No explicit grants"
            description="Admins and principals always have access. Grant access to specific teachers or students here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {data!.map((r) => (
            <li
              key={r.id}
              className="group flex items-center justify-between gap-3 px-4 py-3 md:px-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {r.full_name || r.email || r.user_id}
                </p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {r.role ?? "user"}
                  {r.email ? ` · ${r.email}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                loading={revoke.isPending && revoke.variables === r.user_id}
                icon={<Trash2 className="h-4 w-4 text-destructive" />}
                onClick={() => revoke.mutate(r.user_id)}
                className="text-destructive opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Grant RAG Access" size="sm">
        <div className="space-y-4">
          <Select
            label="Role"
            options={[
              { value: "teacher", label: "Teacher" },
              { value: "student", label: "Student" },
            ]}
            value={role}
            onChange={(e) => {
              setRole(e.target.value as "teacher" | "student");
              setUserId("");
            }}
          />
          <Select
            label="User"
            placeholder={users.isLoading ? "Loading…" : `Select a ${role}`}
            options={userOptions}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          {!users.isLoading && userOptions.length === 0 && (
            <Alert variant="info">No active {role}s at this school yet.</Alert>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => grant.mutate()} loading={grant.isPending} disabled={!userId}>
            Grant
          </Button>
        </ModalFooter>
      </Modal>
    </Panel>
  );
}

// ── Roster tab (roll-number linkage) ──────────────────────────────────────────

function RosterTab({ schoolId }: { schoolId: string }) {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [rollNo, setRollNo] = useState("");

  const students = useActiveUsers(schoolId, "student", true);

  const assign = useMutation({
    mutationFn: () => adminApi.assignRollNo(schoolId, studentId, rollNo.trim()),
    onSuccess: (res) => {
      toast.success(res.message ?? "Roll number assigned");
      queryClient.invalidateQueries({ queryKey: ["admin", "school-users", schoolId, "student"] });
      setStudentId("");
      setRollNo("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const studentOptions = (students.data?.items ?? []).map((s) => ({
    value: s.id,
    label: s.roll_number ? `${userLabel(s)} · Roll ${s.roll_number}` : userLabel(s),
  }));

  return (
    <Panel title="Link Roll Numbers" icon={<IdCard className="h-4 w-4" />}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Link a student account to their attendance roll number so they can view
          their own attendance. To create student rows in bulk, use{" "}
          <Link to="/students/import" className="font-medium text-primary hover:underline">
            Import Students
          </Link>
          .
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Student"
            placeholder={students.isLoading ? "Loading students…" : "Select a student"}
            options={studentOptions}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <Input
            label="Roll Number"
            placeholder="2026-10A-001"
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
          />
        </div>
        {!students.isLoading && studentOptions.length === 0 && (
          <Alert variant="info">No active student accounts at this school yet.</Alert>
        )}
        <Button
          onClick={() => assign.mutate()}
          loading={assign.isPending}
          disabled={!studentId || !rollNo.trim()}
          className="self-start"
        >
          Assign Roll Number
        </Button>
      </div>
    </Panel>
  );
}

// ── Invite Staff modal ────────────────────────────────────────────────────────

function InviteStaffModal({
  schoolId,
  open,
  onClose,
}: {
  schoolId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<"teacher" | "principal">("teacher");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: () =>
      authApi.createInvite({
        role,
        email: email.trim() || undefined,
        school_id: schoolId,
      }),
    onSuccess: (res) => {
      setResult(res.invite_url);
      if (email.trim()) toast.success(`Invite emailed to ${email.trim()}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "invites", schoolId] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const close = () => {
    setEmail("");
    setResult(null);
    invite.reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Invite Staff" size="sm">
      <div className="space-y-4">
        <Select
          label="Role"
          options={[
            { value: "teacher", label: "Teacher" },
            { value: "principal", label: "Co-principal" },
          ]}
          value={role}
          onChange={(e) => setRole(e.target.value as "teacher" | "principal")}
        />
        <Input
          label="Email"
          type="email"
          hint="Optional — leave blank to get a shareable link instead"
          placeholder="new.staff@school.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {result && (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Invite link</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-xs text-foreground">{result}</code>
              <Button
                size="sm"
                variant="outline"
                icon={<Copy className="h-3.5 w-3.5" />}
                onClick={() => {
                  navigator.clipboard?.writeText(result);
                  toast.success("Link copied");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={close}>
          {result ? "Done" : "Cancel"}
        </Button>
        {!result && (
          <Button onClick={() => invite.mutate()} loading={invite.isPending}>
            Create Invite
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

// ── Bulk class-code generation ────────────────────────────────────────────────

/** Mount-on-demand (see Modal unmounts children on close) so initial grade
 *  range seeds cleanly. Generates one code per class × section pair. */
function BulkClassCodeModal({
  schoolId,
  initialFrom = "",
  initialTo = "",
  defaultSession = "",
  onClose,
}: {
  schoolId: string;
  initialFrom?: string;
  initialTo?: string;
  defaultSession?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [sectionsRaw, setSectionsRaw] = useState("");
  const [session, setSession] = useState(defaultSession);

  const classNames = gradeRangeToClassNames(from, to);
  const sections = sectionsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const total = classNames.length * Math.max(1, sections.length);

  const create = useMutation({
    mutationFn: () =>
      adminApi.bulkCreateClassCodes(schoolId, {
        class_names: classNames,
        sections: sections.length ? sections : undefined,
        session: session.trim() || undefined,
      }),
    onSuccess: (codes) => {
      toast.success(`Generated ${codes.length} class code${codes.length === 1 ? "" : "s"}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "class-codes", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "school", schoolId] });
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const gradeFrom = [
    { value: "", label: "— From —" },
    ...GRADE_OPTIONS.map((g) => ({ value: g.value, label: g.label })),
  ];
  const gradeTo = [
    { value: "", label: "— To —" },
    ...GRADE_OPTIONS.filter((g) => g.value !== "0").map((g) => ({
      value: g.value,
      label: g.label,
    })),
  ];

  return (
    <Modal open onClose={onClose} title="Bulk Generate Class Codes" size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generate a class code for every grade in the range (optionally split by
          section). Students use these codes to self-register.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Classes From"
            options={gradeFrom}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Select
            label="Classes To"
            options={gradeTo}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Input
          label="Sections"
          hint="Comma-separated, optional — e.g. A, B, C"
          placeholder="A, B"
          value={sectionsRaw}
          onChange={(e) => setSectionsRaw(e.target.value)}
        />
        <Input
          label="Session"
          hint="Optional — defaults to the school's current session"
          placeholder="2025-26"
          value={session}
          onChange={(e) => setSession(e.target.value)}
        />
        {classNames.length > 0 ? (
          <Alert variant={total > 200 ? "warning" : "info"}>
            Will create <span className="font-semibold">{total}</span> codes —{" "}
            {classNames.length} classes
            {sections.length ? ` × ${sections.length} sections` : ""}.
            {total > 200 && " Reduce the range or sections (limit is 200)."}
          </Alert>
        ) : (
          <Alert variant="warning">Pick a valid grade range to continue.</Alert>
        )}
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => create.mutate()}
          loading={create.isPending}
          disabled={total === 0 || total > 200}
        >
          Generate{total > 0 ? ` (${total})` : ""}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ── Invites tab ─────────────────────────────────────────────────────────────

function formatExpiry(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = d.getTime() - Date.now();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours <= 0) return "expiring";
  if (hours < 48) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

function InvitesTab({
  schoolId,
  onInvite,
}: {
  schoolId: string;
  onInvite: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmRevoke, setConfirmRevoke] = useState<PendingInvite | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "invites", schoolId],
    queryFn: () => authApi.listInvites(schoolId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "invites", schoolId] });

  const resend = useMutation({
    mutationFn: (id: string) => authApi.resendInvite(id),
    onSuccess: (res) => {
      // Emailed invites no longer return the link (token stays server-side);
      // only shareable (no-email) invites include a URL to copy.
      if (res.email) toast.success(`Invite re-sent to ${res.email}`);
      else if (res.invite_url) {
        navigator.clipboard?.writeText(res.invite_url);
        toast.success("New invite link copied to clipboard");
      } else {
        toast.success("Invite refreshed");
      }
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => authApi.revokeInvite(id),
    onSuccess: () => {
      toast.success("Invite revoked");
      invalidate();
      setConfirmRevoke(null);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setConfirmRevoke(null);
    },
  });

  const invites = data ?? [];

  return (
    <Panel
      flush
      title="Pending Invites"
      icon={<Mail className="h-4 w-4" />}
      actions={
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={onInvite}>
          Invite Staff
        </Button>
      }
    >
      {error && (
        <div className="p-4">
          <Alert variant="error">{getErrorMessage(error)}</Alert>
        </div>
      )}
      {isLoading ? (
        <div className="p-4">
          <ListSkeleton items={3} />
        </div>
      ) : invites.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<Mail className="h-10 w-10" />}
            title="No pending invites"
            description="Invite a teacher or co-principal — pending invite links appear here until they're accepted or expire."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {invites.map((inv) => (
            <li
              key={inv.invite_id}
              className="group flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={inv.role === "principal" ? "purple" : "info"} className="capitalize">
                    {inv.role === "principal" ? "Co-principal" : inv.role}
                  </Badge>
                  <span className="truncate text-sm font-medium text-foreground">
                    {inv.email || "Shareable link (no email)"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  Expires {formatExpiry(inv.expires_at)}
                  {inv.invited_by_name || inv.invited_by_email
                    ? ` · by ${inv.invited_by_name || inv.invited_by_email}`
                    : ""}
                  {inv.created_at ? ` · ${formatDate(inv.created_at)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RefreshCw className="h-4 w-4" />}
                  loading={resend.isPending && resend.variables === inv.invite_id}
                  onClick={() => resend.mutate(inv.invite_id)}
                >
                  Resend
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="h-4 w-4 text-destructive" />}
                  onClick={() => setConfirmRevoke(inv)}
                  className="text-destructive hover:text-destructive/80"
                >
                  Revoke
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!confirmRevoke}
        variant="danger"
        title={`Revoke this ${confirmRevoke?.role === "principal" ? "co-principal" : "teacher"} invite?`}
        description="The invite link stops working immediately. You can always send a fresh invite later."
        confirmLabel="Revoke invite"
        loading={revoke.isPending}
        onConfirm={() => confirmRevoke && revoke.mutate(confirmRevoke.invite_id)}
        onClose={() => setConfirmRevoke(null)}
      />
    </Panel>
  );
}

// ── Setup checklist ───────────────────────────────────────────────────────────

function ChecklistItem({
  done,
  label,
  hint,
  action,
}: {
  done: boolean;
  label: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      {done ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? "text-foreground" : "text-foreground"}`}>
          {label}
        </p>
        {!done && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {!done && action}
    </li>
  );
}

function SetupChecklist({
  school,
  onSetSession,
  onGoto,
}: {
  school: SchoolDetail;
  onSetSession: () => void;
  onGoto: (tab: TabId) => void;
}) {
  const items = [
    {
      done: !!school.principal,
      label: "Principal assigned",
      hint: "Provision a principal to run the school.",
      action: (
        <Button size="sm" variant="outline" onClick={() => onGoto("principal")}>
          Add
        </Button>
      ),
    },
    {
      done: !!school.current_session,
      label: "Academic session set",
      hint: "Required for attendance, recording, and RAG session dropdowns.",
      action: (
        <Button size="sm" variant="outline" onClick={onSetSession}>
          Set
        </Button>
      ),
    },
    {
      done: school.counts.class_codes > 0,
      label: "Class codes created",
      hint: "Students can't self-register until at least one code exists.",
      action: (
        <Button size="sm" variant="outline" onClick={() => onGoto("codes")}>
          Generate
        </Button>
      ),
    },
    {
      done: school.counts.teachers > 0,
      label: "Teachers added",
      hint: "Invite teachers so classes can be staffed.",
      action: (
        <Button size="sm" variant="outline" onClick={() => onGoto("invites")}>
          Invite
        </Button>
      ),
    },
    {
      done: school.counts.students > 0,
      label: "Students enrolled",
      hint: "Students join via class codes, or import a roster.",
    },
  ];
  const completed = items.filter((i) => i.done).length;
  const pct = Math.round((completed / items.length) * 100);

  if (completed === items.length) return null;

  return (
    <Panel
      title="Setup checklist"
      icon={<CheckCircle2 className="h-4 w-4" />}
      actions={
        <Badge variant={pct >= 60 ? "success" : "warning"}>
          {completed}/{items.length} done
        </Badge>
      }
    >
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="divide-y divide-border/40">
        {items.map((it) => (
          <ChecklistItem key={it.label} {...it} />
        ))}
      </ul>
    </Panel>
  );
}

// ── Academic-session setter ────────────────────────────────────────────────────

function SetSessionModal({
  school,
  onClose,
}: {
  school: SchoolDetail;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(school.current_session ?? "");

  const save = useMutation({
    mutationFn: () => adminApi.setSchoolSession(school.id, session.trim()),
    onSuccess: () => {
      toast.success("Academic session updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "school", school.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const trimmed = session.trim();
  const valid = /^\d{4}-\d{2,4}$/.test(trimmed);

  return (
    <Modal open onClose={onClose} title="Set Academic Session" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The single source of truth for the session dropdowns in Attendance,
          Recording, and RAG. A school isn&apos;t fully usable until it&apos;s set.
        </p>
        <Input
          label="Academic Session"
          placeholder="2025-26"
          hint="Format: 2025-26 or 2025-2026"
          value={session}
          onChange={(e) => setSession(e.target.value)}
          error={trimmed && !valid ? "Use a session like 2025-26" : undefined}
        />
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!valid}>
          Save session
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type TabId = "overview" | "principal" | "codes" | "teachers" | "rag" | "roster" | "invites";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Building2 className="h-4 w-4" /> },
  { id: "principal", label: "Principal", icon: <UserCircle className="h-4 w-4" /> },
  { id: "codes", label: "Class Codes", icon: <KeyRound className="h-4 w-4" /> },
  { id: "teachers", label: "Teachers", icon: <UsersIcon className="h-4 w-4" /> },
  { id: "invites", label: "Invites", icon: <Send className="h-4 w-4" /> },
  { id: "rag", label: "RAG Access", icon: <BookOpen className="h-4 w-4" /> },
  { id: "roster", label: "Roster", icon: <IdCard className="h-4 w-4" /> },
];

export function SchoolDetailPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("overview");
  const [showInvite, setShowInvite] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [bulk, setBulk] = useState<{ from: string; to: string } | null>(null);
  const [confirmToggle, setConfirmToggle] = useState(false);

  // Fresh from manual creation → jump to Class Codes and offer to generate them
  // for the grade range the admin just entered.
  useEffect(() => {
    const st = location.state as
      | { justCreated?: boolean; classesFrom?: string; classesTo?: string }
      | null;
    if (st?.justCreated) {
      setTab("codes");
      setBulk({ from: st.classesFrom ?? "", to: st.classesTo ?? "" });
    }
  }, [location.state]);

  const { data: school, isLoading, error } = useQuery({
    queryKey: ["admin", "school", schoolId],
    queryFn: () => adminApi.getSchoolDetail(schoolId!),
    enabled: !!schoolId,
  });

  const toggle = useMutation({
    mutationFn: () => adminApi.setSchoolActive(schoolId!, !school!.is_active),
    onSuccess: (res) => {
      toast.success(res.is_active ? "School activated" : "School deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin", "school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
      setConfirmToggle(false);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setConfirmToggle(false);
    },
  });

  if (isLoading) return <PageSkeleton showStats />;

  if (error || !school) {
    return (
      <Alert variant="error">
        {getErrorMessage(error) || "School not found."}{" "}
        <Link to="/admin/schools" className="underline">
          Back to schools
        </Link>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/schools"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to schools
      </Link>

      {/* Header */}
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={school.name} seed={school.id} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">
                {school.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={school.is_active ? "success" : "default"}>
                  {school.is_active ? "Active" : "Inactive"}
                </Badge>
                {school.current_session ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
                    <CalendarClock className="h-3 w-3" />
                    {school.current_session}
                  </span>
                ) : (
                  <Badge variant="warning">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    No session set
                  </Badge>
                )}
                {school.udise_code && (
                  <span className="text-xs text-muted-foreground/70">
                    UDISE {school.udise_code}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon={<CalendarClock className="h-4 w-4" />}
              onClick={() => setShowSession(true)}
            >
              {school.current_session ? "Change Session" : "Set Session"}
            </Button>
            <Button
              variant="outline"
              icon={<Mail className="h-4 w-4" />}
              onClick={() => setShowInvite(true)}
            >
              Invite Staff
            </Button>
            <Button
              variant="outline"
              icon={<Power className="h-4 w-4" />}
              onClick={() => setConfirmToggle(true)}
              className={
                school.is_active
                  ? "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  : undefined
              }
            >
              {school.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </Panel>

      <SetupChecklist
        school={school}
        onSetSession={() => setShowSession(true)}
        onGoto={setTab}
      />

      {/* Counts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={school.counts.students} icon={<GraduationCap className="h-5 w-5" />} color="success" />
        <StatCard label="Teachers" value={school.counts.teachers} icon={<UsersIcon className="h-5 w-5" />} color="primary" />
        <StatCard label="Class Codes" value={school.counts.class_codes} icon={<KeyRound className="h-5 w-5" />} color="info" />
        <StatCard label="Recordings" value={school.counts.recordings} icon={<Mic2 className="h-5 w-5" />} color="warning" />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={(id) => setTab(id as TabId)} />

      {tab === "overview" && <OverviewTab school={school} />}
      {tab === "principal" && <PrincipalTab school={school} />}
      {tab === "codes" && (
        <ClassCodesTab
          schoolId={school.id}
          onBulk={() =>
            setBulk({
              from: school.classes_from ?? "",
              to: school.classes_to ?? "",
            })
          }
        />
      )}
      {tab === "teachers" && <TeachersTab schoolId={school.id} />}
      {tab === "invites" && (
        <InvitesTab schoolId={school.id} onInvite={() => setShowInvite(true)} />
      )}
      {tab === "rag" && <RagAccessTab schoolId={school.id} />}
      {tab === "roster" && <RosterTab schoolId={school.id} />}

      <InviteStaffModal
        schoolId={school.id}
        open={showInvite}
        onClose={() => setShowInvite(false)}
      />

      {showSession && (
        <SetSessionModal school={school} onClose={() => setShowSession(false)} />
      )}

      {bulk && (
        <BulkClassCodeModal
          schoolId={school.id}
          initialFrom={bulk.from}
          initialTo={bulk.to}
          defaultSession={school.current_session ?? ""}
          onClose={() => setBulk(null)}
        />
      )}

      <ConfirmDialog
        open={confirmToggle}
        variant={school.is_active ? "danger" : "primary"}
        title={school.is_active ? `Deactivate ${school.name}?` : `Activate ${school.name}?`}
        description={
          school.is_active
            ? "The school is hidden from onboarding-derived flows. No data is deleted and you can reactivate it any time."
            : "The school becomes active again across the platform."
        }
        confirmLabel={school.is_active ? "Deactivate" : "Activate"}
        loading={toggle.isPending}
        onConfirm={() => toggle.mutate()}
        onClose={() => setConfirmToggle(false)}
      />
    </div>
  );
}
