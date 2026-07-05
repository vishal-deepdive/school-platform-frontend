import { Mail } from "lucide-react";
import { AuthPageHeader } from "@/shared/components/common/AuthPageHeader";
import { ForgotPasswordForm } from "@/features/auth/components";

export function ForgotPasswordPage() {
  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AuthPageHeader
        icon={Mail}
        title="Forgot password?"
        subtitle="No worries — enter your email and we'll send you a reset code."
        className="mb-4"
      />

      <ForgotPasswordForm />
    </div>
  );
}
