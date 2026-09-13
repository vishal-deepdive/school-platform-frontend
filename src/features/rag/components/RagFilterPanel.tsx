import { Select } from "@/shared/components/ui/Select";
import { useSchoolClasses } from "@/shared/hooks/useSchoolClasses";
import { useRagMediums, useRagMetadata } from "@/features/rag/hooks/useRag";
import {
  subjectsForClass,
  chaptersForClassSubject,
  titlesForClassSubjectChapter,
} from "@/features/rag/filters";
import type { RagFilters } from "@/features/rag/types";
import type { SelectOption } from "@/shared/types/common";

interface RagFilterPanelProps {
  filters: RagFilters;
  onChange: (next: RagFilters) => void;
  /** Render the chapter dropdown (default true). */
  showChapter?: boolean;
  /**
   * Render the topic/section dropdown (default false). Narrows retrieval to a
   * single section within the selected chapter — useful for Notes/Questions
   * that should focus on one topic rather than the whole chapter.
   */
  showTitle?: boolean;
  /**
   * Layout of the select container. Defaults to a responsive grid for use
   * inside a FilterBar; pass `"space-y-4"` for narrow vertical contexts such
   * as the Q&A sidebar/modal.
   */
  className?: string;
}

const DEFAULT_LAYOUT = "grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3";

const toOptions = (values: string[], allLabel: string): SelectOption[] => [
  { value: "", label: allLabel },
  ...values.map((v) => ({ value: v, label: v })),
];

/**
 * Cascading Class → Subject → Chapter filter selector shared by the Q&A,
 * Questions, and Notes pages.
 *
 * - Class options come from the school's class roster (`useSchoolClasses`), the
 *   same source attendance and recording use — so a class offered here is one the
 *   school actually teaches, for admins as much as for teachers.
 * - Subject / Chapter options cascade from the `/rag/metadata` hierarchy, so
 *   they only ever offer values that actually have indexed content.
 *
 * Selecting a class resets subject + chapter; selecting a subject resets
 * chapter — keeping the filter object internally consistent.
 */
export function RagFilterPanel({
  filters,
  onChange,
  showChapter = true,
  showTitle = false,
  className = DEFAULT_LAYOUT,
}: RagFilterPanelProps) {
  const { classOptions, isLoading: classesLoading } = useSchoolClasses();
  const { data: mediumData } = useRagMediums();
  // Re-fetches whenever the selected medium changes, so Subject/Chapter/Topic
  // only ever offer that medium's chapters (a Bilingual school picking
  // "Hindi" never sees an English-only chapter mixed in, and vice versa).
  const { data: meta, isFetching: metaFetching } = useRagMetadata(filters.medium);

  // Only a Bilingual school (or an admin) has more than one medium to choose
  // from — an English- or Hindi-only school never sees this redundant control.
  const mediumValues = mediumData?.mediums ?? [];
  const showMedium = mediumValues.length > 1;

  // Roster order (Nursery / KG -> Class 12); no local re-sorting, so this panel
  // can't disagree with the order every other class picker shows.
  const classValues = classOptions.map((o) => o.value);
  const subjectValues = subjectsForClass(meta, filters.class_level);
  const chapterValues = chaptersForClassSubject(
    meta,
    filters.class_level,
    filters.subject,
  );
  const titleValues = titlesForClassSubjectChapter(
    meta,
    filters.class_level,
    filters.subject,
    filters.chapter_name?.[0],
  );

  // Subject/Chapter/Topic cascade from the medium-scoped hierarchy (see
  // useRagMetadata above), so a selection made under the old medium may no
  // longer exist under the new one — reset them, same as switching class.
  const handleMedium = (value: string) =>
    onChange({
      medium: (value || undefined) as RagFilters["medium"],
      class_level: filters.class_level,
    });

  const handleClass = (value: string) =>
    onChange({ medium: filters.medium, class_level: value || undefined });

  const handleSubject = (value: string) =>
    onChange({
      medium: filters.medium,
      class_level: filters.class_level,
      subject: value || undefined,
    });

  const handleChapter = (value: string) =>
    onChange({
      ...filters,
      chapter_name: value ? [value] : undefined,
      title: undefined,
    });

  const handleTitle = (value: string) =>
    onChange({
      ...filters,
      title: value ? [value] : undefined,
    });

  if (classesLoading) {
    return (
      <div className={className}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[62px] animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {showMedium && (
        <Select
          label="Medium"
          options={toOptions(mediumValues, "All mediums")}
          value={filters.medium ?? ""}
          onChange={(e) => handleMedium(e.target.value)}
        />
      )}
      <Select
        label="Class"
        options={toOptions(classValues, "All classes")}
        value={filters.class_level ?? ""}
        onChange={(e) => handleClass(e.target.value)}
      />
      <Select
        label="Subject"
        options={toOptions(subjectValues, "All subjects")}
        value={filters.subject ?? ""}
        onChange={(e) => handleSubject(e.target.value)}
        hint={
          !filters.class_level
            ? "Select a class first"
            : metaFetching
              ? "Updating for the selected medium…"
              : undefined
        }
      />
      {showChapter && (
        <Select
          label="Chapter"
          options={toOptions(chapterValues, "All chapters")}
          value={filters.chapter_name?.[0] ?? ""}
          onChange={(e) => handleChapter(e.target.value)}
          hint={!filters.subject ? "Select a subject first" : undefined}
        />
      )}
      {showTitle && (
        <Select
          label="Topic / Section"
          options={toOptions(titleValues, "Whole chapter")}
          value={filters.title?.[0] ?? ""}
          onChange={(e) => handleTitle(e.target.value)}
          hint={
            !filters.chapter_name?.length
              ? "Select a chapter first"
              : undefined
          }
        />
      )}
    </div>
  );
}
