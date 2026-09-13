import { ClassSelect, SectionSelect } from "@/shared/components/ui/ClassSelect";
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
 * The school is not chosen here — it comes from the global active-school
 * selection: admins pick it once on the dashboard, everyone else is scoped to
 * their own school server-side. Class/Section come from `ClassSelect` /
 * `SectionSelect`, i.e. the school's class roster, so this filter bar offers
 * exactly the same classes as every other screen.
 */
export function AttendanceScopeFilters({
  value,
  onChange,
  showSubject = true,
  layout = "grid",
}: Props) {
  const containerClass =
    layout === "inline"
      ? "flex flex-wrap items-center gap-2 sm:gap-3"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3";

  const fieldWrapperClass = layout === "inline" ? "w-32 sm:w-40" : "w-full";
  const compact = layout === "inline" ? "h-9 text-xs sm:text-sm" : undefined;

  return (
    <div className={containerClass}>
      <div className={fieldWrapperClass}>
        <ClassSelect
          label={layout === "inline" ? undefined : "Class"}
          allOptionLabel="All Classes"
          placeholder="Select Class"
          className={compact}
          value={value.className}
          onChange={(className) => onChange({ ...value, className, section: "" })}
        />
      </div>
      <div className={fieldWrapperClass}>
        <SectionSelect
          className_={value.className}
          label={layout === "inline" ? undefined : "Section"}
          allOptionLabel="All Sections"
          placeholder="Select Section"
          // A filter never needs to invent a section the roster doesn't list:
          // leaving it blank already means "all sections".
          wrapperClassName={compact}
          value={value.section}
          onChange={(section) => onChange({ ...value, section })}
        />
      </div>
      {showSubject && (
        <div className={fieldWrapperClass}>
          <Input
            label={layout === "inline" ? undefined : "Subject"}
            placeholder="Subject"
            value={value.subject}
            className={compact}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
