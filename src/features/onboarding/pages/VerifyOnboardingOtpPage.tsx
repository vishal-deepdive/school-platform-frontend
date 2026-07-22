import { useState, useEffect, useRef, useCallback } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import toast from "@/shared/lib/toast";
import { onboardingApi } from "@/features/onboarding/api/onboarding";
import { getErrorMessage } from "@/shared/lib/utils";
import { AuthInput, AuthButton } from "@/shared/components/ui/auth-fuse";
import { Button } from "@/shared/components/ui/Button";
import { CaptchaWidget, OtpInput } from "@/features/onboarding/components";
import { useOnboardingCapabilities } from "@/features/onboarding/hooks";

// Matches the backend's per-application resend cooldown (service.py
// _OTP_RESEND_COOLDOWN_SECONDS) — kept in sync as a UX nicety; the server is
// still the source of truth and returns retry_after_seconds on 429.
const RESEND_COOLDOWN_SECONDS = 60;

/** you@school.edu.in → yo•••@school.edu.in — enough to confirm the inbox
 *  without exposing the full address on a shareable page. */
function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}•••@${domain}`;
}

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

  // Anti-abuse CAPTCHA for the resend action — the backend requires a token
  // (when CAPTCHA is enabled) because /resend-otp dispatches email/SMS.
  const { data: capabilities, isLoading: capabilitiesLoading } = useOnboardingCapabilities();
  const captchaEnabled = Boolean(
    capabilities?.captcha_enabled && capabilities.captcha_site_key,
  );
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const consumeCaptcha = () => {
    // Turnstile tokens are single-use — force a fresh challenge for the next attempt.
    setCaptchaToken(null);
    setCaptchaResetKey((k) => k + 1);
  };

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
  }, [prefilledId]);

  const verify = useCallback(
    async (code: string) => {
      if (!applicationId.trim()) {
        toast.error("Application ID is required");
        return;
      }
      if (!code.trim() || code.length !== 6) {
        toast.error("Please enter the 6-digit code from your email");
        return;
      }

      try {
        setIsVerifying(true);
        await onboardingApi.verifyEmail(applicationId.trim(), code.trim());
        toast.success("Email verified successfully!");
        navigate(
          `/onboarding/status?id=${encodeURIComponent(applicationId.trim())}`,
        );
      } catch (err) {
        toast.error(getErrorMessage(err));
        setOtp(""); // clear for a clean retry
      } finally {
        setIsVerifying(false);
      }
    },
    [applicationId, navigate],
  );

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    await verify(otp);
  };

  const handleResend = async () => {
    if (!applicationId.trim()) {
      toast.error("Application ID is required to resend OTP");
      return;
    }
    // capabilities?.captcha_enabled is undefined (falsy) until this query
    // resolves, so a resend that races ahead of it would skip the CAPTCHA
    // requirement entirely — block until we actually know.
    if (capabilitiesLoading) {
      toast.error("Still loading — please try again in a moment.");
      return;
    }
    if (captchaEnabled && !captchaToken) {
      toast.error("Please complete the verification challenge first.");
      return;
    }

    try {
      setIsResending(true);
      await onboardingApi.resendOtp(applicationId.trim(), captchaToken ?? undefined);
      toast.success("A new OTP has been sent to your email.");
      startCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      // On a 429 the backend returns machine-readable retry_after_seconds —
      // sync the countdown to it (e.g. if the applicant has two tabs open).
      const retryAfter = (
        err as { response?: { data?: { retry_after_seconds?: unknown } } }
      )?.response?.data?.retry_after_seconds;
      if (typeof retryAfter === "number" && retryAfter > 0) {
        startCooldown(Math.ceil(retryAfter));
      }
      toast.error(getErrorMessage(err));
    } finally {
      if (captchaEnabled) consumeCaptcha();
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
          {state?.email ? (
            <>
              Enter the 6-digit code sent to{" "}
              <strong className="text-foreground">{maskEmail(state.email)}</strong>{" "}
              to verify your onboarding application.
            </>
          ) : (
            "Enter the 6-digit code sent to the principal's email to verify your onboarding application."
          )}
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

        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground">
            OTP Code
          </label>
          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={(code) => {
              // Auto-submit the moment the last digit lands (typed or pasted).
              if (!isVerifying) void verify(code);
            }}
            disabled={isVerifying}
            className="justify-start"
          />
          <p className="text-xs text-muted-foreground">
            Check your email inbox (and spam folder). You can paste the code.
          </p>
        </div>

        <div className="pt-2">
          <AuthButton
            type="submit"
            disabled={isVerifying || otp.length !== 6}
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

        {captchaEnabled && cooldown === 0 && (
          <div className="mt-1">
            <CaptchaWidget
              siteKey={capabilities?.captcha_site_key}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              resetKey={captchaResetKey}
            />
          </div>
        )}

        <div className="text-center mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={
              isResending ||
              isVerifying ||
              !applicationId.trim() ||
              cooldown > 0 ||
              (captchaEnabled && !captchaToken)
            }
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
