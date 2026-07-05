import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import { AuthInput, AuthSubmitButton } from "@/shared/components/ui/auth-fuse";
import { useOtpCooldown } from "../hooks/useOtpCooldown";

export function ForgotPasswordForm() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const watchEmail = useWatch({ control, name: "email", defaultValue: "" });
  const { startCooldown } = useOtpCooldown(watchEmail, "reset_password", false);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await authApi.forgotPassword(data);
      toast.success("OTP sent to your email!");
      startCooldown();
      navigate("/verify-otp", {
        state: { email: data.email, purpose: "reset_password" },
      });
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
      <AuthInput
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="Email Address"
        error={errors.email?.message}
        {...register("email")}
      />

      <AuthSubmitButton icon={Mail} isLoading={isSubmitting} className="mt-2">
        Send reset code
      </AuthSubmitButton>

      <p className="text-center text-sm text-muted-foreground mt-2">
        Remembered it?{" "}
        <Link
          to="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
