import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle } from "lucide-react";
import toast from "@/shared/lib/toast";
import {
  googleCompleteStudentSchema,
  type GoogleCompleteStudentFormData,
} from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import { SESSION_KEYS } from "@/shared/lib/session";
import { AuthInput, AuthSubmitButton } from "@/shared/components/ui/auth-fuse";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import {
  useSchoolSearch,
  useSchoolClasses,
} from "@/shared/hooks/useSchoolSearch";
import type { TokenResponse } from "@/features/auth/types";
import type { CompleteFormProps } from "./types";

export function StudentCompleteForm({
  googleToken,
  prefillName,
  onSuccess,
}: CompleteFormProps) {
  const hintSchoolId =
    sessionStorage.getItem(SESSION_KEYS.PENDING_SCHOOL_ID) ?? "";

  const {
    register,
    setValue,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<GoogleCompleteStudentFormData>({
    resolver: zodResolver(googleCompleteStudentSchema),
    mode: "onTouched",
    defaultValues: {
      full_name: prefillName || undefined,
      school_id: hintSchoolId || undefined,
    },
  });

  const selectedSchoolId = useWatch({
    control,
    name: "school_id",
    defaultValue: hintSchoolId,
  });
  const selectedClassCode = useWatch({
    control,
    name: "class_code",
    defaultValue: "",
  });

  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isSearching: isSearchingSchools,
  } = useSchoolSearch();
  const { options: classOptions, isLoading: isLoadingClasses } =
    useSchoolClasses(selectedSchoolId);

  const onSubmit = async (data: GoogleCompleteStudentFormData) => {
    try {
      const result = await authApi.googleCompleteRegistration({
        google_token: googleToken,
        role: "student",
        full_name: data.full_name || undefined,
        school_id: data.school_id,
        class_code: data.class_code,
        roll_number: data.roll_number,
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
      <p className="text-xs text-muted-foreground bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
        Students need a <strong>School ID</strong> and a{" "}
        <strong>Class Code</strong> provided by their teacher.
      </p>

      <AuthInput
        label="Full Name"
        type="text"
        autoComplete="name"
        autoFocus
        placeholder="Full name"
        error={errors.full_name?.message}
        {...register("full_name")}
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

      <AuthSubmitButton
        icon={CheckCircle}
        isLoading={isSubmitting}
        className="mt-2"
      >
        Join as Student
      </AuthSubmitButton>
    </form>
  );
}
