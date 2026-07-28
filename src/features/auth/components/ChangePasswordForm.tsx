import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import toast from "@/shared/lib/toast";
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { useAuthStore } from "@/features/auth/store/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import {
  AuthPasswordInput,
  AuthSubmitButton,
} from "@/shared/components/ui/auth-fuse";
import { PasswordStrengthMeter } from "@/shared/components/common/PasswordStrengthMeter";

export interface ChangePasswordFormProps {
  /** Where to go after a successful change. Defaults to the dashboard. */
  redirectPath?: string;
  currentPasswordLabel?: string;
  currentPasswordHint?: string;
}

/**
 * Self-service password change for an ALREADY authenticated session —
 * distinct from ResetPasswordForm, which consumes a one-time email-OTP
 * token for a signed-out visitor. Requires the current password as proof.
 *
 * On success, updates the store in place (access token + must_change_password)
 * rather than rebuilding the User object from the JWT via buildUserFromJwt —
 * that helper only knows the handful of fields the JWT itself carries and
 * would silently blank out full_name/mobile/etc. already held in the store.
 */
export function ChangePasswordForm({
  redirectPath = "/dashboard",
  currentPasswordLabel = "Current Password",
  currentPasswordHint,
}: ChangePasswordFormProps) {
  const navigate = useNavigate();
  const { setTokens, updateUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
  });

  const watchPassword = useWatch({
    control,
    name: "new_password",
    defaultValue: "",
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      const { confirm_password: _, ...rest } = data;
      const tokens = await authApi.changePassword(rest);
      setTokens({ access_token: tokens.access_token });
      updateUser({ must_change_password: false });
      toast.success("Password updated — you're all set.");
      navigate(redirectPath, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <AuthPasswordInput
        label={currentPasswordLabel}
        autoComplete="current-password"
        autoFocus
        placeholder="Current password"
        hint={currentPasswordHint}
        error={errors.current_password?.message}
        {...register("current_password")}
      />

      <div className="grid gap-2">
        <AuthPasswordInput
          label="New Password"
          autoComplete="new-password"
          placeholder="New password"
          error={errors.new_password?.message}
          {...register("new_password")}
        />
        {watchPassword && <PasswordStrengthMeter value={watchPassword} />}
      </div>

      <AuthPasswordInput
        label="Confirm New Password"
        autoComplete="new-password"
        placeholder="Confirm new password"
        error={errors.confirm_password?.message}
        {...register("confirm_password")}
      />

      <AuthSubmitButton
        icon={ShieldCheck}
        isLoading={isSubmitting}
        className="mt-2"
      >
        Set new password
      </AuthSubmitButton>
    </form>
  );
}
