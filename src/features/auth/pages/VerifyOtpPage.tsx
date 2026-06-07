import { useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { VerifyOtpForm } from "@/features/auth/components";

export function VerifyOtpPage() {
  const location = useLocation();
  const state = location.state as {
    email?: string;
    purpose?: "verify_email" | "reset_password";
  } | null;

  const purpose = state?.purpose ?? "verify_email";

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center sm:text-left">
        <div className="mb-6 flex justify-center sm:justify-start">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Verify OTP
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {purpose === "verify_email"
            ? "Enter the 6-digit code sent to your email to verify your account."
            : "Enter the 6-digit code sent to your email to reset your password."}
        </p>
      </div>

      <VerifyOtpForm initialEmail={state?.email} initialPurpose={purpose} />
    </div>
  );
}
