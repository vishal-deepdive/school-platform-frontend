import { useAuthStore } from "@/features/auth/store/auth";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";

export interface ScopeValue {
  schoolId?: string;
  /** Resolved school name sent to the API (admin only; blank for others). */
  schoolName: string;
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
 * Shared School / Class / Section / Subject selector for the attendance views.
 *
 * - Admins pick a school (searchable); everyone else is auto-scoped to their own
 *   school by the server, so no school field is shown for them.
 * - Class/Section are dropdowns driven by the school's class codes (with a free
 *   text section fallback for classes that define none) — no more typo-prone
 *   free-text entry.
 */
export function AttendanceScopeFilters({ value, onChange, showSubject = true }: Props) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isSearching: schoolsLoading,
  } = useSchoolSearch();

  // Non-admins load their own school's classes; admins load the picked school's.
  const scopeSchoolId = isAdmin ? value.schoolId : user?.school_id ?? undefined;
  const { classNameOptions, getSectionOptions } = useClassOptions(scopeSchoolId);
  const sectionOptions = value.className ? getSectionOptions(value.className) : [];

  const handleSchool = (id: string) => {
    const name = schoolOptions.find((o) => o.value === id)?.label ?? "";
    onChange({ ...value, schoolId: id, schoolName: name, className: "", section: "" });
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {isAdmin && (
        <SearchableSelect
          label="School"
          placeholder="Select school..."
          options={schoolOptions}
          value={value.schoolId}
          onChange={handleSchool}
          onSearchChange={setSchoolQuery}
          isLoading={schoolsLoading}
        />
      )}
      <Select
        label="Class"
        placeholder={
          isAdmin && !value.schoolId ? "Select a school first" : "Select class"
        }
        options={classNameOptions}
        value={value.className}
        disabled={isAdmin && !value.schoolId}
        onChange={(e) =>
          onChange({ ...value, className: e.target.value, section: "" })
        }
      />
      {sectionOptions.length > 0 ? (
        <Select
          label="Section"
          placeholder="Select section"
          options={sectionOptions}
          value={value.section}
          onChange={(e) => onChange({ ...value, section: e.target.value })}
        />
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
