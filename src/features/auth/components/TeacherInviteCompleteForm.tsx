import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle } from "lucide-react";
import toast from "@/shared/lib/toast";
import {
  googleCompleteTeacherInviteSchema,
  type GoogleCompleteTeacherInviteFormData,
} from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import { AuthInput, AuthSubmitButton } from "@/shared/components/ui/auth-fuse";
import type { TokenResponse } from "@/features/auth/types";
import type { CompleteFormProps } from "./types";

export function TeacherInviteCompleteForm({
  googleToken,
  prefillName,
  inviteToken,
  onSuccess,
}: CompleteFormProps & { inviteToken: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoogleCompleteTeacherInviteFormData>({
    resolver: zodResolver(googleCompleteTeacherInviteSchema),
    mode: "onTouched",
    defaultValues: { full_name: prefillName || undefined },
  });

  const onSubmit = async (data: GoogleCompleteTeacherInviteFormData) => {
    try {
      const result = await authApi.googleCompleteRegistration({
        google_token: googleToken,
        full_name: data.full_name || undefined,
        invite_token: inviteToken,
      });
      if ("access_token" in result) {
        onSuccess(result as TokenResponse);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300"
      noValidate
    >
      <AuthInput
        label="Full Name"
        type="text"
        autoComplete="name"
        autoFocus
        placeholder="Full name (optional)"
        error={errors.full_name?.message}
        {...register("full_name")}
      />

      <AuthSubmitButton
        icon={CheckCircle}
        isLoading={isSubmitting}
        className="mt-2"
      >
        Join as Teacher
      </AuthSubmitButton>
    </form>
  );
}
