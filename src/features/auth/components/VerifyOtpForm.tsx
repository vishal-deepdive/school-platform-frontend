import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, Mail } from "lucide-react";
import toast from "react-hot-toast";
import {
  verifyOtpSchema,
  type VerifyOtpFormData,
} from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { decodeJwt, buildUserFromJwt } from "@/shared/lib/jwt";
import { writeResetFlow, clearOtpFlow } from "@/shared/lib/session";
import { AuthInput, AuthSubmitButton } from "@/shared/components/ui/auth-fuse";
import { OtpInput } from "@/shared/components/ui/OtpInput";
import { Button } from "@/shared/components/ui/Button";
import { useOtpCooldown } from "../hooks/useOtpCooldown";

export interface VerifyOtpFormProps {
  initialEmail?: string;
  initialPurpose?: VerifyOtpFormData["purpose"];
}

export function VerifyOtpForm({
  initialEmail = "",
  initialPurpose = "verify_email",
}: VerifyOtpFormProps) {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    mode: "onTouched",
    defaultValues: { email: initialEmail, purpose: initialPurpose, otp: "" },
  });

  const watchEmail = useWatch({
    control,
    name: "email",
    defaultValue: initialEmail,
  });
  const { isCoolingDown, timeLeft, startCooldown } = useOtpCooldown(
    watchEmail,
    initialPurpose,
  );

  const onSubmit = async (data: VerifyOtpFormData) => {
    try {
      const result = await authApi.verifyOtp(data);

      if ("access_token" in result) {
        clearOtpFlow();
        login(
          result,
          buildUserFromJwt(decodeJwt(result.access_token), data.email),
        );
        toast.success("Email verified! Welcome 🎉");
        navigate("/dashboard", { replace: true });
      } else if ("status" in result && result.status === "pending_approval") {
        clearOtpFlow();
        toast.success(
          result.message || "Email verified! Your account is pending approval.",
        );
        navigate("/login", { replace: true });
      } else {
        toast.success(
          data.purpose === "verify_email"
            ? "Email verified! Please sign in."
            : "OTP verified! Set your new password.",
        );
        if (data.purpose === "reset_password") {
          const resetToken =
            (result as { reset_token?: string }).reset_token ?? "";
          // Persist so a refresh on the reset screen doesn't lose the token.
          writeResetFlow({ email: data.email, resetToken });
          clearOtpFlow();
          navigate("/reset-password", {
            state: { email: data.email, resetToken },
          });
        } else {
          clearOtpFlow();
          navigate("/login");
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onResend = async () => {
    const email = getValues("email");
    const purpose = getValues("purpose");
    if (!email) {
      toast.error("Please enter your email to resend OTP.");
      return;
    }
    try {
      setIsResending(true);
      // Use forgotPassword for reset_password flow, resendOtp for email verification
      if (purpose === "reset_password") {
        await authApi.forgotPassword({ email });
      } else {
        await authApi.resendOtp({ email });
      }
      toast.success("A new OTP has been sent to your email.");
      startCooldown();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      {initialEmail ? (
        <>
          {/* Confirmation of where the code went — the email is locked but visible */}
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/50 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <p className="min-w-0 text-xs text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-foreground break-all">
                {initialEmail}
              </span>
            </p>
          </div>
          <input type="hidden" {...register("email")} />
        </>
      ) : (
        <AuthInput
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="Email Address"
          error={errors.email?.message}
          {...register("email")}
        />
      )}

      <div className="grid gap-2">
        <label className="text-sm font-medium leading-none">
          Enter verification code
        </label>
        <Controller
          control={control}
          name="otp"
          render={({ field }) => (
            <OtpInput
              value={field.value ?? ""}
              onChange={field.onChange}
              onComplete={() => {
                if (!isSubmitting) handleSubmit(onSubmit)();
              }}
              autoFocus
              error={!!errors.otp}
              aria-label="Verification code"
              aria-describedby="otp-hint"
            />
          )}
        />
        {errors.otp ? (
          <p role="alert" className="text-xs text-destructive font-medium">
            {errors.otp.message}
          </p>
        ) : (
          <p id="otp-hint" className="text-xs text-muted-foreground">
            Check your email inbox (and spam folder)
          </p>
        )}
      </div>

      <input type="hidden" {...register("purpose")} />

      <AuthSubmitButton
        icon={ShieldCheck}
        isLoading={isSubmitting}
        className="mt-2"
      >
        Verify code
      </AuthSubmitButton>

      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResend}
          disabled={isResending || isSubmitting || isCoolingDown}
          loading={isResending}
          className="text-primary hover:text-primary/80 hover:bg-transparent"
        >
          {isCoolingDown
            ? `Resend in ${timeLeft}s`
            : "Didn't receive a code? Resend"}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-2">
        <Link
          to="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
