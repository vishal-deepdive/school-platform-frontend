import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Users,
  School,
  ShieldAlert,
  MailOpen,
  Loader2,
} from "lucide-react";
import { AuthButton } from "@/shared/components/ui/auth-fuse";
import { AuthPageHeader } from "@/shared/components/common/AuthPageHeader";
import { isValidInviteToken } from "@/shared/lib/validators";
import { getErrorInfo } from "@/shared/lib/utils";
import { authApi } from "@/features/auth/api/auth";
import {
  TeacherInviteRegisterForm,
  StudentRegisterForm,
  ParentRegisterForm,
} from "@/features/auth/components";

const tabs = [
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "parent", label: "Parent", icon: Users },
] as const;

type TabType = (typeof tabs)[number]["id"];

/** Shared shell for the invite error/invalid states so they stay consistent. */
function InviteProblem({ message }: { message: string }) {
  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Invite Link Problem</h1>
        <p className="text-balance text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex flex-col gap-3">
        <AuthButton asChild variant="outline" className="w-full">
          <Link to="/register">Register as Student or Parent</Link>
        </AuthButton>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenParam = searchParams.get("token");
  const schoolParam =
    searchParams.get("school") || searchParams.get("school_id");
  const roleParam = searchParams.get("role");

  const initialTab: TabType = roleParam === "parent" ? "parent" : "student";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const trimmedToken = (tokenParam ?? "").trim();
  const hasValidToken = tokenParam !== null && isValidInviteToken(trimmedToken);

  // Verify the invite server-side up front so we can greet the teacher with
  // their school, pre-fill the bound email, and fail fast on an
  // expired/used/invalid token instead of only at submit. `enabled` keeps this
  // from firing for the normal (no-token) student/parent registration.
  const preview = useQuery({
    queryKey: ["invite-preview", trimmedToken],
    queryFn: () => authApi.previewInvite(trimmedToken),
    enabled: hasValidToken,
    retry: false,
    staleTime: 60_000,
  });

  // ── Invite-claim flow (teacher / co-principal) ──────────────────────────────
  if (tokenParam !== null) {
    if (!hasValidToken) {
      return (
        <InviteProblem message="This invite link is invalid or has been corrupted. Please ask your school principal to resend the invite." />
      );
    }

    // The preview ENHANCES the page (greeting + email pre-fill); it must never
    // be a hard gate on registration. Only a definitive verdict from the server
    // (a known invite error code) blocks the form. Anything else — a missing/
    // unreachable endpoint (bare 404 "Not Found"), a 5xx, a network blip, rate
    // limiting — degrades to the plain form and lets POST /register/teacher do
    // the authoritative check at submit, so a valid invite is never dead-ended.
    const info = preview.isError ? getErrorInfo(preview.error) : null;
    const DEFINITIVE_INVITE_ERRORS = new Set([
      "invite_not_found",
      "invite_invalid",
      "invite_used",
      "invite_expired",
    ]);
    if (info?.code && DEFINITIVE_INVITE_ERRORS.has(info.code)) {
      return <InviteProblem message={info.message} />;
    }

    if (preview.isLoading) {
      return (
        <div className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-3 py-10 text-center animate-in fade-in duration-500">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking your invite…</p>
        </div>
      );
    }

    // `data` is present on success; undefined when we've degraded past a
    // non-definitive preview error. The form works in both cases.
    const data = preview.data;
    const isPrincipal = data?.role === "principal";
    const boundEmail = data?.email ?? undefined;

    return (
      <div className="mx-auto grid w-full max-w-[400px] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-1 flex flex-col items-center gap-2 text-center">
          <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <MailOpen className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isPrincipal ? "Co-principal Invite" : "Teacher Invite"}
          </h1>
          <p className="text-balance text-sm text-muted-foreground">
            {data ? (
              <>
                You've been invited to join{" "}
                <span className="font-semibold text-foreground">
                  {data.school_name}
                </span>{" "}
                as a {isPrincipal ? "co-principal" : "teacher"}. Complete your
                registration below.
              </>
            ) : (
              <>
                You've been invited to join as a teacher by your school
                principal. Complete your registration below.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <School className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {data ? "Invite verified." : "Invite link detected."}
            </span>{" "}
            {boundEmail
              ? "Register with the email your invite was sent to."
              : "Your invite will be verified when you create your account."}
          </p>
        </div>

        <div className="relative px-1">
          <TeacherInviteRegisterForm
            inviteToken={trimmedToken}
            prefillEmail={boundEmail}
            lockEmail={!!boundEmail}
            navigate={navigate}
          />
        </div>

        <p className="mt-1 text-center text-sm">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // ── Normal self-registration (student / parent) ─────────────────────────────
  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AuthPageHeader
        title="Create an account"
        subtitle="Enter your details below to sign up"
        className="mb-4"
      />

      <div
        role="tablist"
        className="mb-6 flex gap-1 p-1.5 bg-muted rounded-xl border border-border/50"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-register-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? "text-primary bg-background shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Both forms always mounted — CSS toggles visibility to preserve entered data */}
      <div className="relative px-1">
        <div
          id="tabpanel-register-student"
          role="tabpanel"
          className={activeTab !== "student" ? "hidden" : ""}
        >
          <StudentRegisterForm
            defaultSchoolId={schoolParam || ""}
            navigate={navigate}
          />
        </div>
        <div
          id="tabpanel-register-parent"
          role="tabpanel"
          className={activeTab !== "parent" ? "hidden" : ""}
        >
          <ParentRegisterForm
            defaultSchoolId={schoolParam || ""}
            navigate={navigate}
          />
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-muted/50 px-3 py-3 mt-1">
        <School className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">
            Are you a teacher?
          </span>{" "}
          Teacher accounts are created via an invite link sent by your school
          principal. Contact your principal if you haven't received one.
        </p>
      </div>

      <p className="text-center text-sm mt-2">
        Already have an account?{" "}
        <Link
          to="/login"
          className="pl-1 font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
