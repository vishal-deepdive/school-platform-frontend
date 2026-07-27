import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";

export interface ScopeValue {
  className: string;
  section: string;
  subject: string;
}

interface Props {
  value: ScopeValue;
  onChange: (next: ScopeValue) => void;
  showSubject?: boolean;
  layout?: "grid" | "inline";
}

/**
 * Shared Class / Section / Subject selector for the attendance views.
 *
 * The school is no longer chosen here — it comes from the global active-school
 * selection (`useActiveSchool`): admins pick it once in the top bar, everyone
 * else is scoped to their own school server-side. Class/Section are dropdowns
 * driven by that school's class codes, with a free-text section fallback for
 * classes that define none.
 */
export function AttendanceScopeFilters({
  value,
  onChange,
  showSubject = true,
  layout = "grid",
}: Props) {
  const { schoolId } = useActiveSchool();
  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = value.className ? getSectionOptions(value.className) : [];

  const containerClass =
    layout === "inline"
      ? "flex flex-wrap items-center gap-2 sm:gap-3"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3";

  const fieldWrapperClass = layout === "inline" ? "w-32 sm:w-40" : "w-full";

  const classOptionsWithAll = [
    { value: "", label: "All Classes" },
    ...classNameOptions,
  ];

  const sectionOptionsWithAll = [
    { value: "", label: "All Sections" },
    ...sectionOptions,
  ];

  return (
    <div className={containerClass}>
      <div className={fieldWrapperClass}>
        <Select
          label={layout === "inline" ? undefined : "Class"}
          placeholder="Select Class"
          options={classOptionsWithAll}
          value={value.className}
          className={layout === "inline" ? "h-9 text-xs sm:text-sm" : undefined}
          onChange={(e) =>
            onChange({ ...value, className: e.target.value, section: "" })
          }
        />
      </div>
      <div className={fieldWrapperClass}>
        {sectionOptions.length > 0 ? (
          <Select
            label={layout === "inline" ? undefined : "Section"}
            placeholder="Select Section"
            options={sectionOptionsWithAll}
            value={value.section}
            className={layout === "inline" ? "h-9 text-xs sm:text-sm" : undefined}
            onChange={(e) => onChange({ ...value, section: e.target.value })}
          />
        ) : (
          <Input
            label={layout === "inline" ? undefined : "Section"}
            placeholder="Section (A)"
            value={value.section}
            className={layout === "inline" ? "h-9 text-xs sm:text-sm" : undefined}
            onChange={(e) => onChange({ ...value, section: e.target.value })}
          />
        )}
      </div>
      {showSubject && (
        <div className={fieldWrapperClass}>
          <Input
            label={layout === "inline" ? undefined : "Subject"}
            placeholder="Subject"
            value={value.subject}
            className={layout === "inline" ? "h-9 text-xs sm:text-sm" : undefined}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

