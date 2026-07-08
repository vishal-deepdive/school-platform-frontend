import { useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { AuthPageHeader } from "@/shared/components/common/AuthPageHeader";
import { readOtpFlow } from "@/shared/lib/session";
import { VerifyOtpForm } from "@/features/auth/components";

export function VerifyOtpPage() {
  const location = useLocation();
  const state = location.state as {
    email?: string;
    purpose?: "verify_email" | "reset_password";
  } | null;

  // Fall back to sessionStorage so a page refresh (which drops router state)
  // keeps the user on the right flow instead of resetting to verify_email.
  const persisted = readOtpFlow();
  const email = state?.email ?? persisted?.email;
  const purpose = state?.purpose ?? persisted?.purpose ?? "verify_email";

  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AuthPageHeader
        icon={ShieldCheck}
        title={
          purpose === "verify_email" ? "Verify your email" : "Check your email"
        }
        subtitle={
          purpose === "verify_email"
            ? "Enter the 6-digit code sent to your email to verify your account."
            : "Enter the 6-digit code sent to your email to reset your password."
        }
        className="mb-4"
      />

      <VerifyOtpForm initialEmail={email} initialPurpose={purpose} />
    </div>
  );
}
