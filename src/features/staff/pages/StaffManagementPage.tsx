/**
 * Staff Management — the principal's home for their teaching team.
 *
 * Fills the gap left by the Dashboard SetupChecklist (which auto-hides once
 * setup is done): a persistent surface to see the team, invite new teachers,
 * and manage pending invites (resend / revoke). Admins can use it too against
 * their active school; the backend scopes principals to their own school.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Mail,
  UserPlus,
  RefreshCw,
  Trash2,
  Copy,
  Link2,
  Building2,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { authApi, type PendingInvite, type StaffMember } from "@/features/auth/api/auth";
import { useAuthStore } from "@/features/auth/store/auth";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { getErrorMessage, formatDate, cn } from "@/shared/lib/utils";
import { Panel } from "@/shared/components/ui/Panel";
import { Button } from "@/shared/components/ui/Button";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { Avatar } from "@/shared/components/ui/Avatar";

// ─── Small relative-time helpers (no external dep) ─────────────────────────────

function humanizeUntil(iso: string | null): string {
  if (!iso) return "no expiry";
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "expired";
  const h = Math.round(ms / 3_600_000);
  return h < 24 ? `in ${h}h` : `in ${Math.round(h / 24)}d`;
}

function humanizeSince(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  if (ms < 60_000) return "just now";
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

const roleBadge = (role: string): BadgeVariant =>
  role === "principal" ? "purple" : role === "admin" ? "indigo" : "info";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Invite link copied");
  } catch {
    toast.error("Couldn't copy — select and copy the link manually");
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function StaffManagementPage() {
  const { user } = useAuthStore();
  const { schoolId, isAdmin, ready } = useActiveSchool();
  const queryClient = useQueryClient();
  const canInvitePrincipal = user?.role === "admin";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<PendingInvite | null>(null);

  const enabled = !!schoolId;
  const staffQuery = useQuery({
    queryKey: ["staff", schoolId],
    queryFn: () => authApi.listStaff(isAdmin ? schoolId : undefined),
    enabled,
  });
  const invitesQuery = useQuery({
    queryKey: ["staff-invites", schoolId],
    queryFn: () => authApi.listInvites(schoolId ?? ""),
    enabled,
  });

  const resend = useMutation({
    mutationFn: (invitationId: string) => authApi.resendInvite(invitationId),
    onSuccess: (res) => {
      if (res.email) toast.success(`Invite re-sent to ${res.email}`);
      else if (res.invite_url) void copy(res.invite_url);
      else toast.success("Invite refreshed");
      queryClient.invalidateQueries({ queryKey: ["staff-invites", schoolId] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: (invitationId: string) => authApi.revokeInvite(invitationId),
    onSuccess: () => {
      toast.success("Invite revoked");
      setRevokeTarget(null);
      queryClient.invalidateQueries({ queryKey: ["staff-invites", schoolId] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // Admin who hasn't picked a school yet — nudge to the dashboard switcher.
  if (isAdmin && !ready) {
    return (
      <EmptyState
        icon={<Building2 className="h-12 w-12" />}
        title="Select a school first"
        description="Pick a school from the switcher on your Dashboard to manage its staff."
      />
    );
  }

  const invites = invitesQuery.data ?? [];
  const staff = staffQuery.data ?? [];
  const anyError = staffQuery.error || invitesQuery.error;

  return (
    <div className="space-y-6">
      {anyError && (
        <Alert variant="error">
          {getErrorMessage(anyError) || "Failed to load staff."}
        </Alert>
      )}

      {/* ── Pending invites ─────────────────────────────────────────────── */}
      <Panel
        icon={<Mail className="h-5 w-5" />}
        title="Pending invites"
        description="Invites that haven't been accepted yet."
        actions={
          <Button
            size="sm"
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setInviteOpen(true)}
          >
            Invite {canInvitePrincipal ? "teammate" : "teacher"}
          </Button>
        }
        flush
      >
        {invitesQuery.isLoading ? (
          <div className="p-4">
            <ListSkeleton items={2} />
          </div>
        ) : invites.length === 0 ? (
          <div className="p-4">
            <EmptyState
              variant="plain"
              icon={<Mail className="h-10 w-10" />}
              title="No pending invites"
              description="Invite a teacher and their link will appear here until they join."
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
                  <div className="flex items-center gap-2">
                    <Badge variant={roleBadge(inv.role)} className="capitalize">
                      {inv.role === "principal" ? "Co-principal" : inv.role}
                    </Badge>
                    <span className="truncate text-sm font-medium text-foreground">
                      {inv.email ?? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Link2 className="h-3.5 w-3.5" /> Shareable link
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {inv.invited_by_name || inv.invited_by_email
                      ? `Invited by ${inv.invited_by_name || inv.invited_by_email} · `
                      : ""}
                    expires {humanizeUntil(inv.expires_at)} · last sent{" "}
                    {humanizeSince(inv.last_sent_at)}
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
                    className="text-destructive hover:text-destructive/80"
                    onClick={() => setRevokeTarget(inv)}
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ── Team members ────────────────────────────────────────────────── */}
      <Panel
        icon={<Users className="h-5 w-5" />}
        title="Team members"
        actions={
          staff.length > 0 ? (
            <Badge variant="primary">{staff.length} active</Badge>
          ) : undefined
        }
        flush
      >
        {staffQuery.isLoading ? (
          <div className="p-4">
            <ListSkeleton items={3} />
          </div>
        ) : staff.length === 0 ? (
          <div className="p-4">
            <EmptyState
              variant="plain"
              icon={<Users className="h-10 w-10" />}
              title="No staff yet"
              description="Invite your first teacher to get started."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {staff.map((m) => (
              <StaffRow key={m.id} member={m} isSelf={m.id === user?.id} />
            ))}
          </ul>
        )}
      </Panel>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        canInvitePrincipal={canInvitePrincipal}
        schoolId={isAdmin ? schoolId : undefined}
        onInvited={() =>
          queryClient.invalidateQueries({ queryKey: ["staff-invites", schoolId] })
        }
      />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke this invite?"
        description={
          revokeTarget?.email
            ? `${revokeTarget.email} will no longer be able to use their invite link.`
            : "The shareable invite link will stop working immediately."
        }
        confirmLabel="Revoke"
        variant="danger"
        loading={revoke.isPending}
        onConfirm={() => revokeTarget && revoke.mutate(revokeTarget.invite_id)}
        onClose={() => setRevokeTarget(null)}
      />
    </div>
  );
}

// ─── Rows / modal ──────────────────────────────────────────────────────────────

function StaffRow({ member, isSelf }: { member: StaffMember; isSelf: boolean }) {
  const statusVariant: BadgeVariant =
    member.account_status === "active"
      ? member.is_email_verified
        ? "success"
        : "warning"
      : "default";
  const statusLabel =
    member.account_status === "active"
      ? member.is_email_verified
        ? "Active"
        : "Unverified"
      : member.account_status;

  return (
    <li className="group flex items-center justify-between gap-3 px-4 py-3 md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={member.full_name || member.email} seed={member.id} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {member.full_name || member.email}
            {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {member.created_at && (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Joined {formatDate(member.created_at)}
          </span>
        )}
        <Badge variant={statusVariant} className={cn(statusLabel === member.account_status && "capitalize")}>
          {statusLabel}
        </Badge>
        <Badge variant={roleBadge(member.role)} className="capitalize">
          {member.role}
        </Badge>
      </div>
    </li>
  );
}

function InviteModal({
  open,
  onClose,
  canInvitePrincipal,
  schoolId,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  canInvitePrincipal: boolean;
  schoolId?: string;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"teacher" | "principal">("teacher");
  const [expiresHours, setExpiresHours] = useState("48");
  const [linkResult, setLinkResult] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      authApi.createInvite({
        email: email.trim() || undefined,
        role,
        expires_hours: Number(expiresHours),
        school_id: schoolId,
      }),
    onSuccess: (res) => {
      onInvited();
      if (res.email) {
        toast.success(`Invite emailed to ${res.email}`);
        handleClose();
      } else if (res.invite_url) {
        setLinkResult(res.invite_url);
        toast.success("Invite link created — copy and share it");
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleClose() {
    setEmail("");
    setRole("teacher");
    setExpiresHours("48");
    setLinkResult(null);
    create.reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Invite a teammate"
      description="Send an email invite, or create a shareable link to send yourself."
      icon={<UserPlus className="h-5 w-5" />}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            {linkResult ? "Done" : "Cancel"}
          </Button>
          {!linkResult && (
            <Button
              form="invite-form"
              type="submit"
              loading={create.isPending}
              icon={<UserPlus className="h-4 w-4" />}
            >
              Create invite
            </Button>
          )}
        </div>
      }
    >
      <form
        id="invite-form"
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!linkResult) create.mutate();
        }}
      >
        {canInvitePrincipal && (
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as "teacher" | "principal")}
            options={[
              { value: "teacher", label: "Teacher" },
              { value: "principal", label: "Co-principal" },
            ]}
          />
        )}
        <Input
          label="Email (optional)"
          type="email"
          placeholder="teacher@school.edu.in"
          hint="Leave blank to create a shareable link you send yourself."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-autofocus
        />
        <Select
          label="Link expires in"
          value={expiresHours}
          onChange={(e) => setExpiresHours(e.target.value)}
          options={[
            { value: "24", label: "24 hours" },
            { value: "48", label: "48 hours" },
            { value: "168", label: "7 days" },
          ]}
        />

        {linkResult && (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Invite link
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-xs text-foreground">
                {linkResult}
              </code>
              <Button
                size="sm"
                variant="outline"
                icon={<Copy className="h-3.5 w-3.5" />}
                onClick={() => copy(linkResult)}
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
