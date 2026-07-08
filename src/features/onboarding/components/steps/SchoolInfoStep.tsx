import { AuthInput, AuthSelect } from "@/shared/components/ui/auth-fuse";
import { SCHOOL_BOARDS, SCHOOL_TYPES } from "@/features/onboarding/constants";
import type { StepPropsExtra } from "./types";

export function SchoolInfoStep({ register, errors, watch }: StepPropsExtra) {
  const selectedBoard = watch("board");
  const selectedSchoolType = watch("school_type");

  const yearReg = register("established_year");

  return (
    <div className="grid gap-4 lg:grid-cols-2 animate-in fade-in zoom-in-95 duration-300">
      <div className="lg:col-span-2">
        <AuthInput
          label="School Name *"
          type="text"
          placeholder="e.g. Springfield Elementary School"
          autoComplete="organization"
          error={errors.school_name?.message}
          {...register("school_name")}
        />
      </div>

      <AuthSelect
        label="Curriculum Board *"
        error={errors.board?.message}
        {...register("board")}
      >
        <option value="">— Select board —</option>
        {SCHOOL_BOARDS.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </AuthSelect>

      {selectedBoard === "OTHER" && (
        <div className="lg:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <AuthInput
            label="Please specify board *"
            type="text"
            placeholder="e.g. State Board of Technical Education"
            error={errors.other_board?.message}
            {...register("other_board")}
          />
        </div>
      )}

      <AuthSelect
        label="School Type *"
        error={errors.school_type?.message}
        {...register("school_type")}
      >
        <option value="">— Select type —</option>
        {SCHOOL_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </AuthSelect>

      {selectedSchoolType === "other" && (
        <div className="lg:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <AuthInput
            label="Please specify school type *"
            type="text"
            placeholder="e.g. Trust-run, minority institution"
            error={errors.other_school_type?.message}
            {...register("other_school_type")}
          />
        </div>
      )}

      <AuthInput
        label="Year Established"
        type="text"
        inputMode="numeric"
        maxLength={4}
        placeholder="e.g. 1995"
        error={errors.established_year?.message}
        hint="Optional — the year your school was founded"
        {...yearReg}
        onChange={(e) => {
          // Filter non-digits before RHF processes the value
          e.target.value = e.target.value.replace(/\D/g, "");
          yearReg.onChange(e);
        }}
      />
    </div>
  );
}
