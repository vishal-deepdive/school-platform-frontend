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
export function AttendanceScopeFilters({ value, onChange, showSubject = true }: Props) {
  const { schoolId } = useActiveSchool();
  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = value.className ? getSectionOptions(value.className) : [];

  return (
    <div className={
    showSubject
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
      : "flex items-end gap-6"}>

        <div className="w-60">
          <Select
        label="Class"
        placeholder="Select class"
        options={classNameOptions}
        value={value.className}
        onChange={(e) =>
          onChange({ ...value, className: e.target.value, section: "" })
        }
      />
        </div>
      
      {sectionOptions.length > 0 ? (
        
        <div className="w-60">
            <Select
            label="Section"
            placeholder="Select section"
            options={sectionOptions}
            value={value.section}
            onChange={(e) => onChange({ ...value, section: e.target.value })}
            />
        </div>
        
      ) : (
        <Input
          label="Section"
          placeholder="A"
          value={value.section}
          onChange={(e) => onChange({ ...value, section: e.target.value })}
        />
      )}
      {showSubject && (
        <Input
          label="Subject (optional)"
          placeholder="Mathematics"
          value={value.subject}
          onChange={(e) => onChange({ ...value, subject: e.target.value })}
        />
      )}
    </div>
  );
}
