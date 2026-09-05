import { useState } from "react";
import { Loader2, BadgeCheck, Search } from "lucide-react";
import { AuthInput, AuthSelect } from "@/shared/components/ui/auth-fuse";
import { Button } from "@/shared/components/ui/Button";
import { InfoHint } from "@/shared/components/ui/InfoHint";
import { onboardingApi } from "@/features/onboarding/api/onboarding";
import { useOnboardingCapabilities } from "@/features/onboarding/hooks";
import { MEDIUM_OPTIONS } from "@/features/admin/constants";
import type { StepPropsExtra } from "./types";

const CLASS_OPTIONS = Array.from({ length: 13 }, (_, i) => {
  const val = 12 - i;
  return {
    value: String(val),
    label: val === 0 ? "Nursery / KG" : `Class ${val}`,
  };
});

export function AcademicStep({
  register,
  errors,
  watch,
  setValue,
}: StepPropsExtra) {
  const udiseCode = watch("udise_code");
  const udiseReg = register("udise_code");
  const { data: capabilities } = useOnboardingCapabilities();
  const udiseAvailable = capabilities?.udise_lookup_available ?? false;

  const [udiseChecking, setUdiseChecking] = useState(false);
  const [udiseResult, setUdiseResult] = useState<
    "verified" | "unverified" | null
  >(null);

  const handleVerifyUdise = async () => {
    if (!udiseCode || !/^\d{11}$/.test(udiseCode)) return;
    setUdiseChecking(true);
    setUdiseResult(null);
    try {
      const res = await onboardingApi.lookupUdise(udiseCode);
      if (res.verified && res.data) {
        // Auto-fill any fields the registry returned that are still empty.
        if (res.data.school_name)
          setValue("school_name", res.data.school_name, {
            shouldValidate: true,
          });
        if (res.data.state)
          setValue("state", res.data.state, { shouldValidate: true });
        if (res.data.city)
          setValue("city", res.data.city, { shouldValidate: true });
        if (res.data.pin_code)
          setValue("pin_code", res.data.pin_code, { shouldValidate: true });
        setUdiseResult("verified");
      } else {
        setUdiseResult("unverified");
      }
    } catch {
      setUdiseResult("unverified");
    } finally {
      setUdiseChecking(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2 animate-in fade-in zoom-in-95 duration-300">
      <AuthInput
        label="Total Students *"
        type="number"
        inputMode="numeric"
        placeholder="e.g. 500"
        min={1}
        max={200000}
        error={errors.student_count?.message}
        hint="Approximate number of currently enrolled students"
        {...register("student_count")}
      />

      <AuthSelect
        label="Medium of Instruction *"
        error={errors.medium_of_instruction?.message}
        hint="Primary language used for teaching — drives which language books your teachers can upload"
        {...register("medium_of_instruction")}
      >
        <option value="">— Select medium —</option>
        {MEDIUM_OPTIONS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </AuthSelect>

      <div className="grid grid-cols-2 gap-3 lg:col-span-2">
        <AuthSelect
          label="Classes From"
          error={errors.classes_from?.message}
          {...register("classes_from")}
        >
          <option value="">— From —</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </AuthSelect>

        <AuthSelect
          label="Classes To"
          error={errors.classes_to?.message}
          {...register("classes_to")}
        >
          <option value="">— To —</option>
          {CLASS_OPTIONS.filter((c) => c.value !== "0").map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </AuthSelect>
      </div>

      {errors.classes_to?.message && (
        <p className="text-xs text-destructive font-medium -mt-2 lg:col-span-2">
          {errors.classes_to.message}
        </p>
      )}

      <div className="grid gap-2 lg:col-span-2">
        <AuthInput
          label="UDISE Code"
          type="text"
          inputMode="numeric"
          placeholder="11-digit UDISE code (optional)"
          maxLength={11}
          error={errors.udise_code?.message}
          hint="Unified District Information System for Education Plus code"
          {...udiseReg}
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\D/g, "");
            setUdiseResult(null);
            udiseReg.onChange(e);
          }}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleVerifyUdise}
            disabled={
              !udiseAvailable ||
              udiseChecking ||
              !udiseCode ||
              !/^\d{11}$/.test(udiseCode)
            }
            icon={
              udiseChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )
            }
          >
            Verify &amp; auto-fill
          </Button>
          {!udiseAvailable && (
            <span className="text-xs text-muted-foreground">
              Automatic verification isn&apos;t available right now — your code
              is still recorded and reviewed manually.
            </span>
          )}
          {udiseAvailable && udiseResult === "verified" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
              <BadgeCheck className="h-4 w-4" /> Verified against UDISE
            </span>
          )}
          {udiseAvailable && udiseResult === "unverified" && (
            <span className="text-xs text-muted-foreground">
              Couldn&apos;t verify automatically — you can still submit.
            </span>
          )}
          <InfoHint
            className="ml-auto"
            side="top"
            text="UDISE+ is the government's national school ID (11 digits). Providing it lets us verify your school automatically and speeds up approval. It's optional."
          />
        </div>
      </div>
    </div>
  );
}
