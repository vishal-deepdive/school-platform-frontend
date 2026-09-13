import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  CircleAlert,
  IdCard,
  Info,
  KeyRound,
  Mail,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { authApi } from "@/features/auth/api/auth";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Panel } from "@/shared/components/ui/Panel";
import { Skeleton, CardSkeleton } from "@/shared/components/ui/Skeleton";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import type { UserRole } from "@/features/auth/types";

const ROLE_BADGE: Record<UserRole, BadgeVariant> = {
  admin: "danger",
  principal: "warning",
  teacher: "info",
  student: "success",
  parent: "default",
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
    user?.mobile?.charAt(0).toUpperCase() ??
    "U";

  if (isLoading) {
    return (
      <div className="max-w-2xl animate-fade-in space-y-5">
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <div className="flex items-start gap-5">
            <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2.5 pt-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          </div>
        </div>
        <CardSkeleton lines={4} />
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

  // How this account signs in — shown as the first fact, because it decides
  // what the Security card below can offer.
  const signInMethod = user?.email
    ? { icon: <Mail className="h-4 w-4" />, label: "Email", value: user.email }
    : user?.mobile
      ? { icon: <Smartphone className="h-4 w-4" />, label: "Mobile", value: user.mobile }
      : { icon: <IdCard className="h-4 w-4" />, label: "Roll number", value: "Set by your school" };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Identity band */}
      <section className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent"
        />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name ?? "User"}
              className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-background"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-2xl font-bold text-primary ring-2 ring-background">
              {avatarChar}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate font-display text-xl font-semibold tracking-tight text-foreground">
                {user?.full_name ?? "—"}
              </h2>
              {user?.role && <Badge variant={ROLE_BADGE[user.role]}>{user.role}</Badge>}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">
                {signInMethod.icon}
              </span>
              <span className="truncate">{signInMethod.value}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Account */}
      <Panel
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Account"
        description="What this login can do, and whether it is confirmed."
      >
        <dl className="divide-y divide-border/50">
          <Fact label={`${signInMethod.label} sign-in`} value={signInMethod.value} />
          {user?.email && (
            <Fact
              label="Email verified"
              value={
                <StatusValue
                  ok={!!user.is_email_verified}
                  okText="Verified"
                  failText="Not verified — check your inbox"
                />
              }
            />
          )}
          <Fact
            label="Status"
            value={
              <StatusValue
                ok={!!user?.is_active}
                okText="Active"
                failText="Suspended — contact your school"
              />
            }
          />
          {profile?.account_status && (
            <Fact
              label="State"
              value={<span className="capitalize">{profile.account_status.replace(/_/g, " ")}</span>}
            />
          )}
          {user?.school_id && (
            <Fact
              label="School"
              value={
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono text-xs">{user.school_id}</span>
                </span>
              }
            />
          )}
        </dl>
      </Panel>

      {/* Security */}
      <Panel icon={<KeyRound className="h-4 w-4" />} title="Security">
        {user?.email ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Password</p>
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  resetSent
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {resetSent
                  ? "Reset instructions sent — check your inbox."
                  : `We'll email a one-time code to ${user.email}.`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              loading={sendingReset}
              disabled={resetSent}
              onClick={handleChangePassword}
            >
              {resetSent ? "Email sent" : "Change password"}
            </Button>
          </div>
        ) : (
          <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            {user?.role === "parent"
              ? "You sign in with a one-time code sent to your mobile number — there's no password to manage."
              : "Your password is set by your school. Ask your teacher or the school office to reset it if you've forgotten it."}
          </p>
        )}
      </Panel>
    </div>
  );
}

/** One label/value row in the account list. */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function StatusValue({
  ok,
  okText,
  failText,
}: {
  ok: boolean;
  okText: string;
  failText: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
      )}
    >
      {ok ? (
        <BadgeCheck className="h-4 w-4 shrink-0" />
      ) : (
        <CircleAlert className="h-4 w-4 shrink-0" />
      )}
      {ok ? okText : failText}
    </span>
  );
}
