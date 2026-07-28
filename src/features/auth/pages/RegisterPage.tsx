import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  School,
  ShieldAlert,
  MailOpen,
  Loader2,
  GraduationCap,
  Users,
} from "lucide-react";
import { AuthButton } from "@/shared/components/ui/auth-fuse";
import { AuthPageHeader } from "@/shared/components/common/AuthPageHeader";
import { isValidInviteToken } from "@/shared/lib/validators";
import { getErrorInfo } from "@/shared/lib/utils";
import { authApi } from "@/features/auth/api/auth";
import { TeacherInviteRegisterForm } from "@/features/auth/components";

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
          <Link to="/login">Back to Sign In</Link>
        </AuthButton>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenParam = searchParams.get("token");

  const trimmedToken = (tokenParam ?? "").trim();
  const hasValidToken = tokenParam !== null && isValidInviteToken(trimmedToken);

  // Verify the invite server-side up front so we can greet the teacher with
  // their school, pre-fill the bound email, and fail fast on an
  // expired/used/invalid token instead of only at submit.
  const preview = useQuery({
    queryKey: ["invite-preview", trimmedToken],
    queryFn: () => authApi.previewInvite(trimmedToken),
    enabled: hasValidToken,
    retry: false,
    staleTime: 60_000,
  });

  // ── Invite-claim flow (teacher / co-principal) — the only registration
  // path left. Students and parents are provisioned by the school at
  // enrollment, not self-registered (see /login for their dedicated tabs). ──
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

  // ── No invite token: registration is staff-only from here ──────────────────
  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AuthPageHeader
        title="Registration is school-managed"
        subtitle="Student and parent accounts are set up by your school"
        className="mb-1"
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="h-4 w-4" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Students</span> get
            their login (school code + admission number) from their school at
            enrollment.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Parents</span> sign
            in with the mobile number given to the school — no account to
            create.
          </p>
        </div>
      </div>

      <AuthButton asChild className="w-full">
        <Link to="/login">Go to Sign In</Link>
      </AuthButton>

      <div className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-muted/50 px-3 py-3">
        <School className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">
            Are you a teacher?
          </span>{" "}
          Teacher accounts are created via an invite link sent by your school
          principal. Contact your principal if you haven't received one.
        </p>
      </div>
    </div>
  );
}
