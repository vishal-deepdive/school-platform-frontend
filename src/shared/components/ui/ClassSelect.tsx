import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { useAuthStore } from "@/features/auth/store/auth";
import { isSchoolAdmin } from "@/shared/lib/permissions";
import { useSchoolClasses } from "@/shared/hooks/useSchoolClasses";
import { getErrorMessage } from "@/shared/lib/utils";

interface ClassSelectProps {
  value: string;
  onChange: (className: string) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Prepend an "all classes" option — for filter bars rather than forms. */
  allOptionLabel?: string;
  /**
   * Read another school's roster instead of the active one. Only for management
   * screens that operate on a school explicitly (an admin editing school X while
   * their active school is Y).
   */
  schoolId?: string;
}

/**
 * The class picker. Every class dropdown in the app is this component, so the
 * options can only ever come from the school's roster (`useSchoolClasses`) and can
 * never drift back into the three disagreeing sources it replaced: `class_codes`
 * (which emptied out when a join code expired), the onboarding grade range, and
 * hardcoded Nursery–12 lists.
 *
 * When the roster is empty it renders a disabled control plus a pointer to where
 * classes are set up — a misconfigured school stays visible instead of being
 * papered over with grades it doesn't teach.
 */
export function ClassSelect({
  value,
  onChange,
  label = "Class",
  placeholder = "Select class",
  hint,
  error,
  disabled,
  required,
  className,
  allOptionLabel,
  schoolId,
}: ClassSelectProps) {
  const role = useAuthStore((s) => s.user?.role);
  const { classOptions, isLoading, isEmpty, needsSchool, isError, error: fetchError, refetch } =
    useSchoolClasses({ schoolId });

  if (isLoading) {
    return (
      <div className="grid w-full gap-1.5">
        {label && <Skeleton className="h-4 w-16" />}
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  // A failed fetch must never look like an empty-but-valid dropdown — that's
  // indistinguishable from "this school genuinely has no classes" and hides a
  // real backend problem behind what looks like a data-entry gap.
  if (isError) {
    return (
      <div className="grid w-full gap-1.5">
        <Select
          label={label}
          options={[]}
          placeholder="Couldn't load classes"
          disabled
        />
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <span className="min-w-0 truncate" title={getErrorMessage(fetchError)}>
            {getErrorMessage(fetchError)}
          </span>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex shrink-0 items-center gap-1 font-medium hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </p>
      </div>
    );
  }

  if (needsSchool || isEmpty) {
    return (
      <div className="grid w-full gap-1.5">
        <Select
          label={label}
          options={[]}
          placeholder={needsSchool ? "Select a school first" : "No classes set up"}
          disabled
        />
        <p className="text-xs text-muted-foreground">
          {needsSchool ? (
            "Pick a school on the dashboard to load its classes."
          ) : isSchoolAdmin(role) ? (
            <>
              No classes on this school&apos;s roster yet —{" "}
              <Link to="/school" className="font-medium text-primary hover:underline">
                set up classes &amp; sections
              </Link>
              .
            </>
          ) : (
            "No classes have been set up for your school yet — ask your principal to add them."
          )}
        </p>
      </div>
    );
  }

  const options = allOptionLabel
    ? [{ value: "", label: allOptionLabel }, ...classOptions]
    : classOptions;

  return (
    <Select
      label={label}
      options={options}
      placeholder={placeholder}
      hint={hint}
      error={error}
      disabled={disabled}
      required={required}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

interface SectionSelectProps {
  className_: string;
  value: string;
  onChange: (section: string) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  /** Prepend an "all sections" option — for filter bars rather than forms. */
  allOptionLabel?: string;
  /**
   * Render a free-text input when the selected class has no sections on the
   * roster. Forms that must record a section want this; filter bars don't.
   */
  allowFreeText?: boolean;
  wrapperClassName?: string;
  /** See `ClassSelect.schoolId`. */
  schoolId?: string;
}

/**
 * The section picker, cascading from a class on the same roster.
 *
 * A class whose roster entry defines no sections yields no options — the school
 * either runs that class undivided or hasn't recorded its sections yet, so forms
 * fall back to a free-text input (`allowFreeText`) and filters simply disable.
 */
export function SectionSelect({
  className_,
  value,
  onChange,
  label = "Section",
  placeholder = "Select section",
  hint,
  error,
  disabled,
  allOptionLabel,
  allowFreeText = false,
  wrapperClassName,
  schoolId,
}: SectionSelectProps) {
  const { getSectionOptions, isError, error: fetchError, refetch } = useSchoolClasses({ schoolId });
  const sectionOptions = className_ ? getSectionOptions(className_) : [];

  // Same roster fetch as ClassSelect — surface its failure the same way instead
  // of quietly falling back to the free-text/disabled paths below, which would
  // read as "this class has no sections" rather than "the request failed".
  if (isError) {
    return (
      <div className="grid w-full gap-1.5">
        <Select label={label} options={[]} placeholder="Couldn't load sections" disabled />
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <span className="min-w-0 truncate" title={getErrorMessage(fetchError)}>
            {getErrorMessage(fetchError)}
          </span>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex shrink-0 items-center gap-1 font-medium hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </p>
      </div>
    );
  }

  if (className_ && sectionOptions.length === 0 && allowFreeText) {
    return (
      <Input
        label={label}
        placeholder="e.g. A"
        hint={hint ?? "No sections on the roster for this class — type one if it applies."}
        error={error}
        disabled={disabled}
        className={wrapperClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  const options = allOptionLabel
    ? [{ value: "", label: allOptionLabel }, ...sectionOptions]
    : sectionOptions;

  return (
    <Select
      label={label}
      options={options}
      placeholder={!className_ ? "Select a class first" : placeholder}
      hint={hint}
      error={error}
      disabled={disabled || !className_ || sectionOptions.length === 0}
      className={wrapperClassName}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
