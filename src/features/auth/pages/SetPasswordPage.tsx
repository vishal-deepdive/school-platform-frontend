import { Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { AuthPageHeader } from "@/shared/components/common/AuthPageHeader";
import { useAuthStore } from "@/features/auth/store/auth";
import { ChangePasswordForm } from "@/features/auth/components";

/**
 * Reached two ways: forced (ProtectedRoute redirects here whenever
 * user.must_change_password is true — a student still on their
 * school-issued date-of-birth default) or voluntary (anyone with a
 * password-based account can navigate here directly to change it).
 *
 * Deliberately offers no "skip" / "back to dashboard" link — when forced,
 * ProtectedRoute re-redirects here on every render regardless of where the
 * user tries to navigate (see ProtectedRoute's docstring), so a link out
 * would be a dead end anyway; when voluntary, the sidebar is still there.
 *
 * Lives under AuthLayout (outside ProtectedRoute's own subtree, alongside
 * /complete-profile and /reset-password) — a page refresh here re-enters
 * directly rather than round-tripping through ProtectedRoute, so this page
 * checks isAuthenticated itself instead of relying on that gate.
 */
export function SetPasswordPage() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isForced = user?.must_change_password ?? false;
  const isStudent = user?.role === "student";

  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AuthPageHeader
        icon={ShieldCheck}
        title={isForced ? "Set your password" : "Change your password"}
        subtitle={
          isForced
            ? "Your school set up this account with a temporary password. Choose your own to continue."
            : "Choose a new password for your account."
        }
        className="mb-4"
      />

      <ChangePasswordForm
        currentPasswordLabel={
          isForced && isStudent ? "Current Password (date of birth)" : "Current Password"
        }
        currentPasswordHint={
          isForced && isStudent ? "DDMMYYYY — the password your school gave you" : undefined
        }
      />
    </div>
  );
}
