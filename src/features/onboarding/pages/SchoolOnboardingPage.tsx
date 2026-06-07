/**
 * School self-onboarding wizard — 5 steps:
 *   1. School Info       (name, board, type, year)
 *   2. Contact & Address (email, mobile, address, city, state, PIN)
 *   3. Academic Details  (student count, classes, medium, UDISE)
 *   4. Documents         (school registration certificate — file upload)
 *   5. Principal Account (name, email, password, terms)
 */
import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  GraduationCap,
  FileText,
  User,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import type { FieldPath } from "react-hook-form";
import type { SchoolOnboardingFormData } from "@/lib/validators";
import { onboardingApi } from "@/api/onboarding";
import { getErrorMessage, cn } from "@/lib/utils";
import { SESSION_KEYS, removeSession } from "@/lib/session";
import { AuthButton } from "@/components/ui/auth-fuse";
import type { OnboardingApplicationResponse } from "@/types/onboarding";

import {
  StepIndicator,
  SuccessState,
  SchoolInfoStep,
  ContactStep,
  AcademicStep,
  DocumentsStep,
  PrincipalStep,
  useOnboardingForm,
  type StepIndex,
} from "@/features/onboarding";

// ── Constants ─────────────────────────────────────────────────────────────────
const STEPS: {
  id: StepIndex;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}[] = [
  { id: 1, title: "School Info", subtitle: "Basic details", icon: Building2 },
  {
    id: 2,
    title: "Contact & Address",
    subtitle: "Location & contact",
    icon: MapPin,
  },
  {
    id: 3,
    title: "Academic Details",
    subtitle: "Curriculum & size",
    icon: GraduationCap,
  },
  { id: 4, title: "Documents", subtitle: "Certificate upload", icon: FileText },
  {
    id: 5,
    title: "Principal Account",
    subtitle: "Login credentials",
    icon: User,
  },
];

const STEP_FIELDS: Record<StepIndex, FieldPath<SchoolOnboardingFormData>[]> = {
  1: ["school_name", "board", "other_board", "school_type", "established_year"],
  2: ["email", "mobile", "phone", "address_line_1", "city", "state", "pin_code", "area"],
  3: [
    "student_count",
    "classes_from",
    "classes_to",
    "medium_of_instruction",
    "other_medium_of_instruction",
  ],
  4: [],
  5: [
    "principal_name",
    "principal_email",
    "principal_password",
    "confirm_password",
    "terms",
  ],
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export function SchoolOnboardingPage() {
  const { methods, currentStep, setCurrentStep } = useOnboardingForm();
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = methods;

  const [certificate, setCertificate] = useState<File | null>(null);
  const [certError, setCertError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] =
    useState<OnboardingApplicationResponse | null>(null);
  const [principalEmail, setPrincipalEmail] = useState("");

  const handleNext = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (currentStep === 4) {
      if (!certificate) {
        setCertError("Please upload the school registration certificate");
        return;
      }
      setCertError("");
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const fields = STEP_FIELDS[currentStep];
    const valid = await trigger(fields);
    if (valid) {
      setCurrentStep((s: StepIndex) => Math.min(s + 1, 5) as StepIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep, certificate, trigger, setCurrentStep]);

  const handleBack = useCallback(() => {
    setCurrentStep((s: StepIndex) => Math.max(s - 1, 1) as StepIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setCurrentStep]);

  const onSubmit = async (data: SchoolOnboardingFormData) => {
    if (!certificate) {
      setCurrentStep(4);
      setCertError("Please upload the school registration certificate");
      toast.error("Missing certificate — please upload it on step 4");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();

      // Step 1
      fd.append("school_name", data.school_name);
      fd.append("board", data.board);
      if (data.other_board?.trim())
        fd.append("other_board", data.other_board.trim());
      fd.append("school_type", data.school_type);
      if (data.established_year?.trim())
        fd.append("established_year", data.established_year.trim());

      // Step 2
      fd.append("email", data.email);
      fd.append("mobile", data.mobile);
      if (data.phone?.trim()) fd.append("phone", data.phone.trim());
      fd.append("address_line_1", data.address_line_1);
      if (data.address_line_2?.trim())
        fd.append("address_line_2", data.address_line_2.trim());
      fd.append("city", data.city);
      fd.append("state", data.state);
      fd.append("pin_code", data.pin_code);

      // Step 3
      fd.append("student_count", data.student_count);
      if (data.medium_of_instruction?.trim())
        fd.append("medium_of_instruction", data.medium_of_instruction.trim());
      if (data.other_medium_of_instruction?.trim())
        fd.append(
          "other_medium_of_instruction",
          data.other_medium_of_instruction.trim(),
        );
      if (data.classes_from?.trim())
        fd.append("classes_from", data.classes_from.trim());
      if (data.classes_to?.trim())
        fd.append("classes_to", data.classes_to.trim());
      if (data.udise_code?.trim())
        fd.append("udise_code", data.udise_code.trim());

      // Step 4
      fd.append("certificate", certificate, certificate.name);

      // Step 5
      fd.append("principal_name", data.principal_name);
      fd.append("principal_email", data.principal_email);
      fd.append("principal_password", data.principal_password);

      const response = await onboardingApi.apply(fd);
      setPrincipalEmail(data.principal_email);
      setSubmitted(response);
      removeSession(SESSION_KEYS.ONBOARDING_FORM, SESSION_KEYS.ONBOARDING_STEP);
      toast.success("Application submitted!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SuccessState response={submitted} principalEmail={principalEmail} />
    );
  }

  const stepInfo = STEPS[currentStep - 1];
  const StepIcon = stepInfo.icon;

  return (
    <div className="mx-auto grid w-full max-w-[440px] gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          School Onboarding
        </h1>
        <p className="text-sm text-muted-foreground">
          Register your school on the DeepDive platform
        </p>
      </div>

      <StepIndicator current={currentStep} total={5} />

      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <StepIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">
            {stepInfo.title}
          </h2>
          <p className="text-xs text-muted-foreground">{stepInfo.subtitle}</p>
        </div>
        <span className="text-xs text-muted-foreground font-medium tabular-nums shrink-0">
          {currentStep} / 5
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {currentStep === 1 && (
          <SchoolInfoStep
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        )}
        {currentStep === 2 && (
          <ContactStep
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        )}
        {currentStep === 3 && (
          <AcademicStep
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        )}
        {currentStep === 4 && (
          <DocumentsStep
            certificate={certificate}
            setCertificate={setCertificate}
            certError={certError}
            setCertError={setCertError}
          />
        )}
        {currentStep === 5 && (
          <PrincipalStep
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        )}

        <div className="flex gap-3 mt-6">
          {currentStep > 1 && (
            <AuthButton
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </AuthButton>
          )}

          {currentStep < 5 ? (
            <AuthButton
              key="continue-btn"
              type="button"
              className={cn("flex-1", currentStep === 1 && "w-full")}
              onClick={handleNext}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </AuthButton>
          ) : (
            <AuthButton
              key="submit-btn"
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </AuthButton>
          )}
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
