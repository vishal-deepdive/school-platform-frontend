import type {
  UseFormRegister,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";
import type { SchoolOnboardingFormData } from "@/features/onboarding/schema";

export type FormRegister = UseFormRegister<SchoolOnboardingFormData>;
export type FormErrors = FieldErrors<SchoolOnboardingFormData>;
export type FormWatch = UseFormWatch<SchoolOnboardingFormData>;
export type FormSetValue = UseFormSetValue<SchoolOnboardingFormData>;

export interface StepProps {
  register: FormRegister;
  errors: FormErrors;
}

export interface StepPropsExtra extends StepProps {
  watch: FormWatch;
  setValue: FormSetValue;
}
