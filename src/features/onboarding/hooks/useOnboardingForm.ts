import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  schoolOnboardingSchema,
  type SchoolOnboardingFormData,
} from "@/features/onboarding/schema";
import { readSession, SESSION_KEYS } from "@/shared/lib/session";
import type { StepIndex } from "../components/StepIndicator";

export function useOnboardingForm() {
  const [currentStep, setCurrentStepState] = useState<StepIndex>(() => {
    const saved = sessionStorage.getItem(SESSION_KEYS.ONBOARDING_STEP);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= 1 && parsed <= 5) return parsed as StepIndex;
    }
    return 1;
  });

  const defaultValues: Partial<SchoolOnboardingFormData> = {
    board: "" as never,
    school_type: "" as never,
    state: "",
    area: "",
    area_required: "",
    established_year: "",
    phone: "",
    address_line_2: "",
    medium_of_instruction: "",
    classes_from: "",
    classes_to: "",
    udise_code: "",
    terms: false,
  };

  // readSession wraps JSON.parse in try/catch — safe against corrupt sessionStorage
  const savedData = readSession<Partial<SchoolOnboardingFormData>>(
    SESSION_KEYS.ONBOARDING_FORM,
  );
  const initialData = savedData
    ? { ...defaultValues, ...savedData }
    : defaultValues;

  const methods = useForm<SchoolOnboardingFormData>({
    resolver: zodResolver(schoolOnboardingSchema),
    defaultValues: initialData,
    mode: "onTouched",
  });

  const saveTimerRef = useRef<number | null>(null);
  // Autosave indicator state: "idle" until first edit, "saving" while debouncing,
  // "saved" once the write lands. Drives the "Saved" badge in the wizard header.
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  // Debounced persist — batches rapid keystrokes into one write per 400 ms
  useEffect(() => {
    const subscription = methods.watch((value) => {
      setSaveState("saving");
      if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        sessionStorage.setItem(
          SESSION_KEYS.ONBOARDING_FORM,
          JSON.stringify(value),
        );
        setSaveState("saved");
      }, 400);
    });
    return () => {
      subscription.unsubscribe();
      if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    };
  }, [methods]);

  const setCurrentStep = useCallback(
    (step: StepIndex | ((prev: StepIndex) => StepIndex)) => {
      setCurrentStepState((prev) => {
        const next = typeof step === "function" ? step(prev) : step;
        sessionStorage.setItem(SESSION_KEYS.ONBOARDING_STEP, String(next));
        return next;
      });
    },
    [],
  );

  return { methods, currentStep, setCurrentStep, saveState };
}
