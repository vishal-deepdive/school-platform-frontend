import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import toast from "@/shared/lib/toast";
import {
  teacherInviteFormSchema,
  type TeacherInviteFormData,
} from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import { writeOtpFlow } from "@/shared/lib/session";
import {
  AuthInput,
  AuthPasswordInput,
  AuthSubmitButton,
} from "@/shared/components/ui/auth-fuse";
import { TermsCheckbox } from "@/shared/components/common/TermsCheckbox";
import { OrDivider } from "@/shared/components/common/OrDivider";
import { PasswordStrengthMeter } from "@/shared/components/common/PasswordStrengthMeter";
import { GoogleButton } from "./GoogleButton";
import { useOtpCooldown } from "../hooks/useOtpCooldown";
import type { NavProps } from "./types";

export function TeacherInviteRegisterForm({
  inviteToken,
  navigate,
}: NavProps & { inviteToken: string }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TeacherInviteFormData>({
    resolver: zodResolver(teacherInviteFormSchema),
    mode: "onTouched",
    defaultValues: { terms: false },
  });

  const watchEmail = useWatch({ control, name: "email", defaultValue: "" });
  const watchPassword = useWatch({ control, name: "password", defaultValue: "" });
  const { startCooldown } = useOtpCooldown(watchEmail, "verify_email", false);

  const onSubmit = async (data: TeacherInviteFormData) => {
    try {
      const { confirm_password: _, terms: __, ...rest } = data;
      await authApi.registerTeacher({ ...rest, invite_token: inviteToken });
      toast.success("Teacher account created! Please verify your email.");
      startCooldown();
      writeOtpFlow({ email: data.email, purpose: "verify_email" });
      navigate("/verify-otp", {
        state: { email: data.email, purpose: "verify_email" },
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-4 animate-in fade-in zoom-in-95 duration-300"
      noValidate
    >
      <AuthInput
        label="Full Name"
        type="text"
        autoComplete="name"
        autoFocus
        placeholder="Full name"
        error={errors.full_name?.message}
        {...register("full_name")}
      />

      <AuthInput
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="Email Address"
        error={errors.email?.message}
        {...register("email")}
      />

      <div className="grid gap-2">
        <AuthPasswordInput
          label="Password"
          autoComplete="new-password"
          placeholder="Password"
          error={errors.password?.message}
          {...register("password")}
        />
        {watchPassword && <PasswordStrengthMeter value={watchPassword} />}
      </div>

      <AuthPasswordInput
        label="Confirm Password"
        autoComplete="new-password"
        placeholder="Confirm password"
        error={errors.confirm_password?.message}
        {...register("confirm_password")}
      />

      <TermsCheckbox error={errors.terms?.message} {...register("terms")} />

      <AuthSubmitButton
        icon={UserPlus}
        isLoading={isSubmitting}
        className="mt-2"
      >
        Create Teacher Account
      </AuthSubmitButton>

      <OrDivider />

      <GoogleButton options={{ role: "teacher", inviteToken }} />
    </form>
  );
}
