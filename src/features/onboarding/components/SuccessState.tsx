import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Check, Copy, MailCheck } from "lucide-react";
import toast from "@/shared/lib/toast";
import { Button } from "@/shared/components/ui/Button";
import { AuthButton } from "@/shared/components/ui/auth-fuse";
import type { OnboardingApplicationResponse } from "@/features/onboarding/types";

export function SuccessState({
  response,
  principalEmail,
}: {
  response: OnboardingApplicationResponse;
  principalEmail: string;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(response.application_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-[440px] gap-5 animate-in fade-in zoom-in-95 duration-500">
      {/* Check icon */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-9 w-9 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Application Submitted!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground text-balance">
            {response.message}
          </p>
        </div>
      </div>

      {/* Application ID */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3.5">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          Application ID — save this for status checks
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono text-foreground break-all">
            {response.application_id}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copyId}
            aria-label="Copy application ID"
            className="flex-shrink-0 p-1.5"
            icon={copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Email verification nudge */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5">
        <MailCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Verify your email next
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            A verification OTP has been sent to{" "}
            <strong className="text-foreground">{principalEmail}</strong>.
            Verifying helps speed up the admin review.
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-2.5">
        <AuthButton
          className="w-full"
          onClick={() =>
            navigate("/onboarding/verify", {
              state: {
                applicationId: response.application_id,
                email: principalEmail,
              },
            })
          }
        >
          <MailCheck className="h-4 w-4 mr-2" />
          Verify Email Now
        </AuthButton>
        <AuthButton
          variant="outline"
          className="w-full"
          onClick={() =>
            navigate(
              `/onboarding/status?id=${encodeURIComponent(response.application_id)}`,
            )
          }
        >
          Check Application Status
        </AuthButton>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Your application is under review. The admin will notify you by email
        once a decision is made.
      </p>
    </div>
  );
}
