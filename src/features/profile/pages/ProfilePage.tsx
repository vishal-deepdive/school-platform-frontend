import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  KeyRound,
  Mail,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { authApi } from "@/features/auth/api/auth";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { Skeleton, CardSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { getErrorMessage } from "@/shared/lib/utils";
import type { UserRole } from "@/features/auth/types";

const ROLE_BADGE: Record<UserRole, BadgeVariant> = {
  admin: "danger",
  principal: "warning",
  teacher: "info",
  student: "success",
  parent: "default",
  viewer: "default",
};

export function ProfilePage() {
  const { user: storedUser } = useAuthStore();
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: () => authApi.me(),
    staleTime: 5 * 60_000,
  });

  const user = profile ?? storedUser;

  const handleChangePassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await authApi.forgotPassword({ email: user.email });
      setResetSent(true);
      toast.success("Check your email for password reset instructions.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSendingReset(false);
    }
  };

  const avatarChar =
    user?.full_name?.charAt(0).toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    "U";

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6 animate-fade-in">
        {/* Identity card — avatar + text lines */}
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <div className="flex items-start gap-5">
            <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2.5 pt-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          </div>
        </div>
        {/* Account status card */}
        <CardSkeleton lines={4} />
        {/* Security card */}
        <CardSkeleton lines={2} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl">
        <Alert variant="error">{getErrorMessage(error)}</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Identity */}
      <Card padding="md">
        <div className="flex items-start gap-5">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name ?? "User"}
              className="h-16 w-16 shrink-0 rounded-xl object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl font-bold ring-2 ring-border">
              {avatarChar}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-foreground truncate">
                {user?.full_name ?? "—"}
              </h2>
              {user?.role && (
                <Badge variant={ROLE_BADGE[user.role]}>
                  {user.role}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </p>
            {user?.school_id && (
              <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono text-xs truncate">{user.school_id}</span>
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Account status */}
      <Card padding="md">
        <CardHeader title="Account Status" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <StatusRow
            label="Email"
            ok={!!user?.is_email_verified}
            okText="Verified"
            failText="Not verified"
          />
          <StatusRow
            label="Account"
            ok={!!user?.is_active}
            okText="Active"
            failText="Suspended"
          />
          {profile?.account_status && (
            <div className="col-span-2 pt-1 border-t border-border/40">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                State
              </span>
              <p className="mt-1 text-sm text-foreground capitalize">
                {profile.account_status.replace(/_/g, " ")}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Security */}
      <Card padding="md">
        <CardHeader
          title="Security"
          description="We'll email you a one-time code to set a new password."
        />
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Password</p>
            {resetSent ? (
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                Reset instructions sent — check your inbox.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                A reset link will be sent to {user?.email}.
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={sendingReset}
            disabled={resetSent}
            onClick={handleChangePassword}
          >
            {resetSent ? "Email sent" : "Change Password"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function StatusRow({
  label,
  ok,
  okText,
  failText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  failText: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
        )}
        <span
          className={`text-sm font-medium ${
            ok ? "text-green-600 dark:text-green-400" : "text-destructive"
          }`}
        >
          {ok ? okText : failText}
        </span>
      </div>
    </div>
  );
}
