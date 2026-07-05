import { useLocation } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { AuthPageHeader } from "@/shared/components/common/AuthPageHeader";
import { ResetPasswordForm } from "@/features/auth/components";

export function ResetPasswordPage() {
  const location = useLocation();
  const state = location.state as { email?: string; resetToken?: string } | null;

  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AuthPageHeader
        icon={KeyRound}
        title="Set new password"
        subtitle="Create a strong password for your account."
        className="mb-4"
      />

      <ResetPasswordForm resetToken={state?.resetToken} />
    </div>
  );
}
