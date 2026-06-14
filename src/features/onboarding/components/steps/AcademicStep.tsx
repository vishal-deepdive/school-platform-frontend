import { AuthInput, AuthSelect } from "@/shared/components/ui/auth-fuse";
import type { StepPropsExtra } from "./types";

const CLASS_OPTIONS = Array.from({ length: 13 }, (_, i) => {
  const val = 12 - i;
  return {
    value: String(val),
    label: val === 0 ? "Nursery / KG" : `Class ${val}`,
  };
});

const MEDIUM_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "Hindi" },
  { value: "Regional", label: "Regional Language" },
  { value: "Bilingual", label: "Bilingual (English + Regional)" },
  { value: "Other", label: "Other" },
];

export function AcademicStep({ register, errors, watch }: StepPropsExtra) {
  const selectedMedium = watch("medium_of_instruction");
  const udiseReg = register("udise_code");

  return (
    <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
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
        label="Medium of Instruction"
        error={errors.medium_of_instruction?.message}
        hint="Primary language used for teaching"
        {...register("medium_of_instruction")}
      >
        <option value="">— Select medium (optional) —</option>
        {MEDIUM_OPTIONS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </AuthSelect>

      {selectedMedium === "Other" && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <AuthInput
            label="Please specify medium *"
            type="text"
            placeholder="e.g. French, German"
            error={errors.other_medium_of_instruction?.message}
            {...register("other_medium_of_instruction")}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
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
        <p className="text-xs text-destructive font-medium -mt-2">
          {errors.classes_to.message}
        </p>
      )}

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
          udiseReg.onChange(e);
        }}
      />
    </div>
  );
}
