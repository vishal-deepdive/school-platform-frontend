import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import {
  studentRegisterSchema,
  type StudentRegisterFormData,
} from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import {
  AuthInput,
  AuthPasswordInput,
  AuthButton,
  AuthSubmitButton,
} from "@/shared/components/ui/auth-fuse";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { TermsCheckbox } from "@/shared/components/common/TermsCheckbox";
import { OrDivider } from "@/shared/components/common/OrDivider";
import { GoogleIcon } from "./GoogleIcon";
import {
  useSchoolSearch,
  useSchoolClasses,
} from "@/shared/hooks/useSchoolSearch";
import { useGoogleAuth } from "@/features/auth/hooks/useGoogleAuth";
import { useOtpCooldown } from "../hooks/useOtpCooldown";
import type { NavProps } from "./types";

export function StudentRegisterForm({
  defaultSchoolId,
  navigate,
}: NavProps & { defaultSchoolId: string }) {
  const {
    register,
    setValue,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StudentRegisterFormData>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: { school_id: defaultSchoolId, terms: false },
  });

  // useWatch instead of watch — only re-renders on changes to these specific fields
  const watchEmail = useWatch({ control, name: "email", defaultValue: "" });
  const selectedSchoolId = useWatch({
    control,
    name: "school_id",
    defaultValue: defaultSchoolId,
  });
  const selectedClassCode = useWatch({
    control,
    name: "class_code",
    defaultValue: "",
  });

  const { startCooldown } = useOtpCooldown(watchEmail, "verify_email", false);

  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isSearching: isSearchingSchools,
  } = useSchoolSearch();
  const { options: classOptions, isLoading: isLoadingClasses } =
    useSchoolClasses(selectedSchoolId);

  const { handleGoogleLogin } = useGoogleAuth();

  const onSubmit = async (data: StudentRegisterFormData) => {
    try {
      const { confirm_password: _, terms: __, ...payload } = data;
      await authApi.registerStudent(payload);
      toast.success("Student account created! Please verify your email.");
      startCooldown();
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

      <SearchableSelect
        label="School"
        placeholder="Search for your school..."
        searchPlaceholder="Type school name or address..."
        options={schoolOptions}
        value={selectedSchoolId}
        onChange={(val) => {
          setValue("school_id", val, { shouldValidate: true });
          setValue("class_code", "", { shouldValidate: true });
        }}
        onSearchChange={setSchoolQuery}
        isLoading={isSearchingSchools}
        error={errors.school_id?.message}
        hint="Search by name, city, or address"
      />

      <SearchableSelect
        label="Class"
        placeholder={
          selectedSchoolId ? "Select your class..." : "Select a school first..."
        }
        searchPlaceholder="Search classes..."
        options={classOptions}
        value={selectedClassCode}
        disabled={!selectedSchoolId}
        onChange={(val) =>
          setValue("class_code", val, { shouldValidate: true })
        }
        isLoading={isLoadingClasses}
        error={errors.class_code?.message}
        hint="Provided by your class teacher"
      />

      <AuthInput
        label="Roll Number"
        type="text"
        placeholder="Enter your roll number"
        error={errors.roll_number?.message}
        {...register("roll_number")}
      />

      <AuthPasswordInput
        label="Password"
        autoComplete="new-password"
        placeholder="Password"
        error={errors.password?.message}
        hint="Min 8 chars, uppercase, lowercase, digit &amp; special char"
        {...register("password")}
      />

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
        Create Student Account
      </AuthSubmitButton>

      <OrDivider />

      <AuthButton
        type="button"
        variant="outline"
        className="w-full"
        onClick={() =>
          handleGoogleLogin({
            role: "student",
            schoolId: selectedSchoolId ?? "",
          })
        }
      >
        <GoogleIcon />
        Continue with Google
      </AuthButton>
    </form>
  );
}
