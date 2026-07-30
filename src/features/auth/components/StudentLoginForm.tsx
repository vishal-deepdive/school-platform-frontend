import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
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
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginFormData>({
    resolver: zodResolver(studentLoginSchema),
    mode: "onTouched",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: schools = [], isLoading: isSchoolsLoading } = useQuery({
    queryKey: ["schools", debouncedQuery],
    queryFn: () => authApi.searchSchools(debouncedQuery),
    staleTime: 60000,
  });

  // const schoolOptions = schools
  //   .filter((s) => s.code)
  //   .map((s) => ({
  //     label: s.name,
  //     value: s.code!,
  //     sublabel: [s.city, s.state].filter(Boolean).join(", ") || undefined,
  //   }));

  const schoolOptions = schools.map((s) => ({
  label: s.name,
  value: s.code ?? s.name, // temporary fallback
  sublabel: [s.city, s.state].filter(Boolean).join(", ") || undefined,
}));

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
      <Controller
        name="school_code"
        control={control}
        render={({ field }) => (
          <SearchableSelect
            label="School"
            placeholder="Select your school..."
            searchPlaceholder="Search by name, city or code..."
            options={schoolOptions}
            value={field.value}
            onChange={field.onChange}
            onSearchChange={setSearchQuery}
            isLoading={isSchoolsLoading}
            error={errors.school_code?.message}
            hint="Ask your teacher if you can't find your school"
          />
        )}
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
