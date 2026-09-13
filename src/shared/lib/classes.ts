/**
 * Canonical class/grade vocabulary — mirrors `app/shared/classes.py` on the
 * backend exactly (which is what the DB stores and what the class roster serves).
 *
 * This is ONLY for the two places that define or edit a *grade range* rather than
 * read a school's classes: the onboarding wizard and the admin school form. Every
 * other class dropdown must read the school's roster — use the `ClassSelect` /
 * `SectionSelect` components, or `useSchoolClasses()`. Hardcoding class options in
 * a feature is what made the UI disagree with itself in the first place.
 */

export const PRE_PRIMARY_LABEL = "Nursery / KG";

/** Index === the numeric token stored in `schools.classes_from` / `classes_to`. */
export const ALL_CLASS_LEVELS: readonly string[] = [
  PRE_PRIMARY_LABEL,
  ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`),
];

export interface GradeOption {
  /** Token persisted on the school ("0" = Nursery/KG, "1".."12"). */
  value: string;
  /** Canonical label — identical to what the roster and the DB use. */
  label: string;
}

/**
 * Grade options for a classes-from/to range, in ascending order
 * (Nursery / KG → Class 12).
 *
 * Ascending deliberately: the onboarding wizard used to list 12 → 1 while every
 * other class picker counted up, which is part of the inconsistency this replaces.
 */
export const GRADE_OPTIONS: readonly GradeOption[] = ALL_CLASS_LEVELS.map(
  (label, index) => ({ value: String(index), label }),
);

/** Expand an inclusive grade range (by `GRADE_OPTIONS` value) into canonical labels. */
export function gradeRangeToClassNames(from: string, to: string): string[] {
  // Blank bounds mean "no range declared", not grade 0 — `Number("")` is 0, which
  // would otherwise conjure a Nursery / KG class for a school that declared none.
  if (!from?.trim() || !to?.trim()) return [];
  const lo = Number(from);
  const hi = Number(to);
  if (Number.isNaN(lo) || Number.isNaN(hi) || hi < lo) return [];
  return ALL_CLASS_LEVELS.slice(
    Math.max(0, lo),
    Math.min(ALL_CLASS_LEVELS.length, hi + 1),
  );
}

/** Position of a canonical label in the vocabulary; unknown labels sort last. */
export function classSortOrder(label: string | undefined | null): number {
  if (!label) return ALL_CLASS_LEVELS.length;
  const index = ALL_CLASS_LEVELS.indexOf(label);
  return index === -1 ? ALL_CLASS_LEVELS.length : index;
}

/**
 * Order class labels the way every class picker does: Nursery / KG → Class 12,
 * with anything outside the vocabulary (a stream, a legacy spelling) after them,
 * alphabetically. Use this anywhere classes are listed from data rather than from
 * the roster, so a table can't disagree with the dropdown above it.
 */
export function sortClassesCanonical(classes: string[]): string[] {
  return [...classes].sort((a, b) => {
    const diff = classSortOrder(a) - classSortOrder(b);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}
