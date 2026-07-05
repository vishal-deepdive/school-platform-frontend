import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import { clearResetFlow, clearOtpFlow } from "@/shared/lib/session";
import {
  AuthPasswordInput,
  AuthSubmitButton,
} from "@/shared/components/ui/auth-fuse";
import { PasswordStrengthMeter } from "@/shared/components/common/PasswordStrengthMeter";

export interface ResetPasswordFormProps {
  resetToken?: string;
}

export function ResetPasswordForm({ resetToken = "" }: ResetPasswordFormProps) {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues: { reset_token: resetToken },
  });

  const watchPassword = useWatch({
    control,
    name: "new_password",
    defaultValue: "",
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const { confirm_password: _, ...rest } = data;
      await authApi.resetPassword(rest);
      clearResetFlow();
      clearOtpFlow();
      toast.success("Password reset! Please sign in with your new password.");
      navigate("/login");
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
      <input type="hidden" {...register("reset_token")} />

      <div className="grid gap-2">
        <AuthPasswordInput
          label="New Password"
          autoComplete="new-password"
          autoFocus
          placeholder="New password"
          error={errors.new_password?.message}
          {...register("new_password")}
        />
        {watchPassword && <PasswordStrengthMeter value={watchPassword} />}
      </div>

      <AuthPasswordInput
        label="Confirm Password"
        autoComplete="new-password"
        placeholder="Confirm new password"
        error={errors.confirm_password?.message}
        {...register("confirm_password")}
      />

      <AuthSubmitButton
        icon={KeyRound}
        isLoading={isSubmitting}
        className="mt-2"
      >
        Reset password
      </AuthSubmitButton>

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
