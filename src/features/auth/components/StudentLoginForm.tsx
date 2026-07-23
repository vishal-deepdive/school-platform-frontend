import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap } from "lucide-react";
import toast from "@/shared/lib/toast";
import {
  studentLoginSchema,
  type StudentLoginFormData,
} from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { useAuthStore } from "@/features/auth/store/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import { decodeJwt, buildUserFromJwt } from "@/shared/lib/jwt";
import {
  AuthInput,
  AuthPasswordInput,
  AuthSubmitButton,
} from "@/shared/components/ui/auth-fuse";

/**
 * Student login — school code + admission (roll) number + password. No email
 * or phone of the student's own required; the password defaults to their
 * date of birth (DDMMYYYY) at enrollment. Students never self-register — see
 * admin.service.create_student / bulk_import_students.
 */
export function StudentLoginForm({
  redirectPath = "/dashboard",
}: {
  redirectPath?: string;
}) {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginFormData>({
    resolver: zodResolver(studentLoginSchema),
    mode: "onTouched",
  });

  const onSubmit = async (data: StudentLoginFormData) => {
    try {
      const tokens = await authApi.loginStudent(data);
      login(tokens, buildUserFromJwt(decodeJwt(tokens.access_token), null));
      toast.success("Welcome back!");
      navigate(redirectPath, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <AuthInput
        label="School Code"
        type="text"
        autoComplete="off"
        autoFocus
        placeholder="e.g. SPE-001"
        hint="Ask your teacher if you don't know your school's code"
        error={errors.school_code?.message}
        {...register("school_code")}
      />
      <AuthInput
        label="Admission / Roll Number"
        type="text"
        autoComplete="username"
        placeholder="2026-7A-014"
        error={errors.roll_no?.message}
        {...register("roll_no")}
      />
      <AuthPasswordInput
        label="Password"
        autoComplete="current-password"
        placeholder="Password"
        hint="Your default password is your date of birth (DDMMYYYY)"
        error={errors.password?.message}
        {...register("password")}
      />

      <AuthSubmitButton
        icon={GraduationCap}
        isLoading={isSubmitting}
        className="mt-2"
      >
        Sign in
      </AuthSubmitButton>
    </form>
  );
}
