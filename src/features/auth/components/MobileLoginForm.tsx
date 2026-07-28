import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Smartphone, ShieldCheck, ArrowLeft } from "lucide-react";
import toast from "@/shared/lib/toast";
import {
  mobileOtpRequestSchema,
  mobileOtpVerifySchema,
  type MobileOtpRequestFormData,
  type MobileOtpVerifyFormData,
} from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { useAuthStore } from "@/features/auth/store/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import { decodeJwt, buildUserFromJwt } from "@/shared/lib/jwt";
import { AuthInput, AuthSubmitButton } from "@/shared/components/ui/auth-fuse";
import { OtpInput } from "@/shared/components/ui/OtpInput";
import { Button } from "@/shared/components/ui/Button";
import { useOtpCooldown } from "../hooks/useOtpCooldown";

/**
 * Guardian login — mobile number + OTP, no self-registration. The mobile
 * number is provisioned by the school at enrollment (see admin.service
 * create_student / bulk_import_students), so an unrecognized number surfaces
 * a clear error rather than a silent "sent" — see auth.services.session
 * request_mobile_login_otp.
 */
export function MobileLoginForm({
  redirectPath = "/dashboard",
}: {
  redirectPath?: string;
}) {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [mobile, setMobile] = useState("");

  const requestForm = useForm<MobileOtpRequestFormData>({
    resolver: zodResolver(mobileOtpRequestSchema),
    mode: "onTouched",
  });

  const verifyForm = useForm<MobileOtpVerifyFormData>({
    resolver: zodResolver(mobileOtpVerifySchema),
    mode: "onTouched",
    defaultValues: { mobile: "", otp: "" },
  });

  const { isCoolingDown, timeLeft, startCooldown } = useOtpCooldown(
    mobile,
    "login_mobile",
  );

  // startCooldown is bound to `mobile` as of the render it was read in. Calling
  // it inline right after setMobile(data.mobile) would use the STALE (empty)
  // closure from before that state update lands — the cooldown would silently
  // never start for the first send. Firing it from an effect keyed on `mobile`
  // guarantees it runs against the render where the real number is in scope.
  useEffect(() => {
    if (mobile) startCooldown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  const onRequestOtp = async (data: MobileOtpRequestFormData) => {
    try {
      await authApi.requestMobileOtp(data);
      setMobile(data.mobile);
      verifyForm.reset({ mobile: data.mobile, otp: "" });
      toast.success("A 6-digit code has been sent to your mobile.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onResend = async () => {
    try {
      await authApi.requestMobileOtp({ mobile });
      startCooldown();
      toast.success("A new code has been sent.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onVerify = async (data: MobileOtpVerifyFormData) => {
    try {
      const tokens = await authApi.verifyMobileOtp(data);
      login(tokens, buildUserFromJwt(decodeJwt(tokens.access_token), null));
      toast.success("Welcome back!");
      navigate(redirectPath, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!mobile) {
    return (
      <form
        onSubmit={requestForm.handleSubmit(onRequestOtp)}
        className="flex flex-col gap-5"
        noValidate
      >
        <AuthInput
          label="Mobile Number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          autoFocus
          placeholder="9876543210"
          error={requestForm.formState.errors.mobile?.message}
          {...requestForm.register("mobile")}
        />
        <AuthSubmitButton
          icon={Smartphone}
          isLoading={requestForm.formState.isSubmitting}
          className="mt-2"
        >
          Send code
        </AuthSubmitButton>
      </form>
    );
  }

  return (
    <form
      onSubmit={verifyForm.handleSubmit(onVerify)}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/50 px-3 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Smartphone className="h-4 w-4" />
        </div>
        <p className="min-w-0 text-xs text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-foreground">{mobile}</span>
        </p>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium leading-none">
          Enter verification code
        </label>
        <Controller
          control={verifyForm.control}
          name="otp"
          render={({ field }) => (
            <OtpInput
              value={field.value ?? ""}
              onChange={field.onChange}
              onComplete={() => {
                if (!verifyForm.formState.isSubmitting) {
                  verifyForm.handleSubmit(onVerify)();
                }
              }}
              autoFocus
              error={!!verifyForm.formState.errors.otp}
              aria-label="Verification code"
            />
          )}
        />
        {verifyForm.formState.errors.otp && (
          <p role="alert" className="text-xs text-destructive font-medium">
            {verifyForm.formState.errors.otp.message}
          </p>
        )}
      </div>

      <AuthSubmitButton
        icon={ShieldCheck}
        isLoading={verifyForm.formState.isSubmitting}
        className="mt-2"
      >
        Verify &amp; sign in
      </AuthSubmitButton>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMobile("")}
          className="text-muted-foreground hover:text-foreground hover:bg-transparent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change number
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResend}
          disabled={isCoolingDown}
          className="text-primary hover:text-primary/80 hover:bg-transparent"
        >
          {isCoolingDown ? `Resend in ${timeLeft}s` : "Resend code"}
        </Button>
      </div>
    </form>
  );
}
