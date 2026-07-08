import { Link, useLocation } from "react-router-dom";
import { KeyRound, AlertTriangle } from "lucide-react";
import { AuthPageHeader } from "@/shared/components/common/AuthPageHeader";
import { AuthButton } from "@/shared/components/ui/auth-fuse";
import { readResetFlow } from "@/shared/lib/session";
import { ResetPasswordForm } from "@/features/auth/components";

export function ResetPasswordPage() {
  const location = useLocation();
  const state = location.state as { email?: string; resetToken?: string } | null;

  // Prefer router state; fall back to sessionStorage so a refresh here doesn't
  // strand the user with an un-re-enterable reset token.
  const persisted = readResetFlow();
  const resetToken = state?.resetToken || persisted?.resetToken || "";

  if (!resetToken) {
    return (
      <div className="mx-auto grid w-full max-w-[400px] gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Reset link expired
          </h1>
          <p className="text-balance text-sm text-muted-foreground">
            We couldn't find an active reset request. Reset codes are single-use
            and time-limited — please request a new one to continue.
          </p>
        </div>
        <AuthButton asChild className="w-full">
          <Link to="/forgot-password">Request a new reset code</Link>
        </AuthButton>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AuthPageHeader
        icon={KeyRound}
        title="Set new password"
        subtitle="Create a strong password for your account."
        className="mb-4"
      />

      <ResetPasswordForm resetToken={resetToken} />
    </div>
  );
}
