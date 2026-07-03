import { useState, useEffect, useRef } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { onboardingApi } from "@/features/onboarding/api/onboarding";
import { getErrorMessage } from "@/shared/lib/utils";
import { AuthInput, AuthButton } from "@/shared/components/ui/auth-fuse";
import { Button } from "@/shared/components/ui/Button";

// Matches the backend's per-application resend cooldown (service.py
// _OTP_RESEND_COOLDOWN_SECONDS) — kept in sync as a UX nicety; the server is
// still the source of truth and returns the exact remaining seconds on 429.
const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyOnboardingOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = location.state as {
    applicationId?: string;
    email?: string;
  } | null;

  // Prefer router state (from the success screen); fall back to the ?id= query
  // param so email deep-links land here with the Application ID pre-filled.
  const prefilledId = state?.applicationId ?? searchParams.get("id") ?? "";
  const [applicationId, setApplicationId] = useState(prefilledId);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef<number | null>(null);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (cooldownTimerRef.current !== null) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = window.setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current !== null) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // An OTP was already sent when the applicant arrived here (either from the
  // success screen or an email deep-link) — start the cooldown immediately so
  // "Resend" can't be spam-clicked right away.
  useEffect(() => {
    if (prefilledId) startCooldown(RESEND_COOLDOWN_SECONDS);
    return () => {
      if (cooldownTimerRef.current !== null) clearInterval(cooldownTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledId]);

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
      startCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      // On a 429 the backend returns the exact remaining seconds — sync the
      // countdown to it (e.g. if the applicant has two tabs open) instead of
      // guessing with the default cooldown.
      const message = getErrorMessage(err);
      const match = message.match(/wait (\d+) seconds/);
      if (match) startCooldown(parseInt(match[1], 10));
      toast.error(message);
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
            disabled={!!prefilledId} // Locked when arriving via state or ?id= link
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isResending || isVerifying || !applicationId.trim() || cooldown > 0}
            loading={isResending}
            className="text-primary hover:text-primary/80 hover:bg-transparent disabled:opacity-60"
          >
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Didn't receive a code? Resend"}
          </Button>
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
