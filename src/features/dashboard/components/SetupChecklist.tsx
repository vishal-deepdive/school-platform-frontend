/**
 * Post-approval setup checklist — shown to a freshly-approved principal so the
 * gap between "approved" and "first class running" is guided, not guessed.
 *
 * Reads live counts from GET /admin/schools/{id}/setup-status and renders a
 * progress list with contextual CTAs. Includes an inline invite form that can
 * add teachers *and* co-principals (multi-admin) without leaving the page.
 * Auto-hides once every step is complete.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  Users,
  UserPlus,
  KeyRound,
  UploadCloud,
  Copy,
  Loader2,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { adminApi } from "@/features/admin/api/admin";
import { authApi } from "@/features/auth/api/auth";
import { useAuthStore } from "@/features/auth/store/auth";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { getErrorMessage, cn } from "@/shared/lib/utils";
import { isSchoolAdmin } from "@/shared/lib/permissions";

type Item = {
  key: string;
  label: string;
  done: boolean;
  icon: React.ElementType;
  cta?: { label: string; to?: string; onClick?: () => void };
};

export function SetupChecklist() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const schoolId = user?.school_id ?? "";
  const canSee = !!schoolId && isSchoolAdmin(user?.role);
  // Only platform admins may mint co-principal invites (the API returns 403
  // otherwise). This checklist is a principal surface, so the role toggle is
  // hidden unless an admin is viewing — principals invite teachers only.
  const canInvitePrincipal = user?.role === "admin";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"teacher" | "principal">("teacher");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["school-setup-status", schoolId],
    queryFn: () => adminApi.getSetupStatus(schoolId),
    enabled: canSee,
    staleTime: 60_000,
  });

  if (!canSee || isLoading || !data) return null;

  const items: Item[] = [
    {
      key: "teachers",
      label: "Invite your teachers",
      done: data.teachers > 0,
      icon: Users,
      cta: { label: "Invite", onClick: () => setInviteOpen((v) => !v) },
    },
    {
      key: "class_codes",
      label: "Create class codes for students to join",
      done: data.class_codes > 0,
      icon: KeyRound,
    },
    {
      key: "students",
      label: "Add your students (bulk import or enroll)",
      done: data.students > 0,
      icon: UploadCloud,
      cta: { label: "Import roster", to: "/students/import" },
    },
  ];

  const completed = items.filter((i) => i.done).length;
  // All done → nothing to nudge; hide the card entirely.
  if (completed === items.length) return null;

  const handleInvite = async () => {
    setInviteBusy(true);
    setInviteUrl("");
    try {
      const res = await authApi.createInvite({
        email: inviteEmail.trim() || undefined,
        role: inviteRole,
      });
      setInviteUrl(res.invite_url);
      if (inviteEmail.trim()) {
        toast.success(`Invite emailed to ${inviteEmail.trim()}`);
        setInviteEmail("");
      } else {
        toast.success("Invite link created — copy and share it");
      }
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setInviteBusy(false);
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Card padding="md" className="border-primary/30">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Finish setting up your school
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {completed} of {items.length} done — a few steps to go live.
          </p>
        </div>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(completed / items.length) * 100}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3 py-3">
            {item.done ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
            )}
            <span
              className={cn(
                "flex-1 text-sm",
                item.done
                  ? "text-muted-foreground line-through"
                  : "text-foreground",
              )}
            >
              {item.label}
            </span>
            {!item.done && item.cta && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const cta = item.cta!;
                  if (cta.to) navigate(cta.to);
                  else cta.onClick?.();
                }}
              >
                {item.cta.label}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {inviteOpen && (
        <div className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium text-foreground">
            {canInvitePrincipal ? "Invite a team member" : "Invite a teacher"}
          </p>
          {canInvitePrincipal && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInviteRole("teacher")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  inviteRole === "teacher"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                Teacher
              </button>
              <button
                type="button"
                onClick={() => setInviteRole("principal")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  inviteRole === "principal"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                Co-principal
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="email@school.edu.in (optional — blank = shareable link)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleInvite} disabled={inviteBusy}>
              {inviteBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-1 h-4 w-4" />
              )}
              Create invite
            </Button>
          </div>
          {inviteUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <code className="flex-1 truncate text-xs text-foreground">
                {inviteUrl}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyInvite}
                icon={<Copy className="h-4 w-4" />}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
