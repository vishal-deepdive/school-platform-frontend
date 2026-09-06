import { Select } from "@/shared/components/ui/Select";
import { sortClassesDescending } from "@/shared/lib/utils";
import {
  useRagClassLevels,
  useRagMediums,
  useRagCascadingOptions,
} from "@/features/rag/hooks/useRag";
// import {
//   subjectsForClass,
//   chaptersForClassSubject,
//   titlesForClassSubjectChapter,
// } from "@/features/rag/filters";
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
 * - Class options come from `/rag/classes` (the school's onboarding grades, or
 *   the full Nursery–12 list for admins).
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
  const { data: classData, isLoading: classesLoading } = useRagClassLevels();
  const { data: mediumData } = useRagMediums();

  const mediumValues = mediumData?.mediums ?? [];
  const showMedium = mediumValues.length > 1;

  const classValues = sortClassesDescending(classData?.class_levels ?? []);

  const cascadingFilters = {
    medium: filters.medium,
    class_level: filters.class_level,
    subject: filters.subject,
    chapter_name: filters.chapter_name?.[0],
  };

  const {
    data: cascadingData,
    isLoading: cascadingLoading,
  } = useRagCascadingOptions(cascadingFilters);

  const subjectValues = cascadingData?.subject ?? [];
  const chapterValues = cascadingData?.chapter_name ?? [];
  const titleValues = cascadingData?.title ?? [];

  const handleMedium = (value: string) =>
    onChange({
      medium: (value || undefined) as RagFilters["medium"],
      class_level: filters.class_level,
      subject: undefined,
      chapter_name: undefined,
      title: undefined,
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
            : cascadingLoading
              ? "Loading subjects…"
              : undefined
        }
      />
      {showChapter && (
        <Select
          label="Chapter"
          options={toOptions(chapterValues, "All chapters")}
          value={filters.chapter_name?.[0] ?? ""}
          onChange={(e) => handleChapter(e.target.value)}
          hint={
            !filters.subject
              ? "Select a subject first"
              : cascadingLoading
                ? "Loading chapters…"
                : undefined
          }
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
              : cascadingLoading
                ? "Loading topics…"
                : undefined
          }
        />
      )}
    </div>
  );
}
