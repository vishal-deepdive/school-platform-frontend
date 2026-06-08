import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { onboardingApi } from "@/features/onboarding/api/onboarding";
import { getErrorMessage } from "@/shared/lib/utils";
import { AuthInput, AuthButton } from "@/shared/components/ui/auth-fuse";

export function VerifyOnboardingOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    applicationId?: string;
    email?: string;
  } | null;

  const [applicationId, setApplicationId] = useState(
    state?.applicationId ?? "",
  );
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!applicationId.trim()) {
      toast.error("Application ID is required");
      return;
    }
    if (!otp.trim() || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      setIsVerifying(true);
      await onboardingApi.verifyEmail(applicationId.trim(), otp.trim());
      toast.success("Email verified successfully!");
      navigate(
        `/onboarding/status?id=${encodeURIComponent(applicationId.trim())}`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!applicationId.trim()) {
      toast.error("Application ID is required to resend OTP");
      return;
    }

    try {
      setIsResending(true);
      await onboardingApi.resendOtp(applicationId.trim());
      toast.success("A new OTP has been sent to your email.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center sm:text-left">
        <div className="mb-6 flex justify-center sm:justify-start">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Verify School Email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the 6-digit code sent to your email to verify your onboarding
          application.
        </p>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-5" noValidate>
        <div>
          <AuthInput
            label="Application ID"
            type="text"
            placeholder="Paste your application ID"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            disabled={!!state?.applicationId} // Disable if passed via state
            required
          />
        </div>

        <div>
          <AuthInput
            label="OTP Code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            hint="Check your email inbox (and spam folder)"
            className="font-mono text-center text-lg tracking-widest"
            required
          />
        </div>

        <div className="pt-2">
          <AuthButton
            type="submit"
            disabled={isVerifying}
            className="w-full mt-2"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-2" />
            )}
            Verify OTP
          </AuthButton>
        </div>

        <div className="text-center mt-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || isVerifying || !applicationId.trim()}
            className="text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
          >
            {isResending ? "Resending..." : "Didn't receive a code? Resend"}
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-2">
          <Link
            to="/onboarding/apply"
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Back to Application
          </Link>
        </p>
      </form>
    </div>
  );
}
