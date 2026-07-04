import { Select } from "@/shared/components/ui/Select";
import { sortClassesDescending } from "@/shared/lib/utils";
import { useRagClassLevels, useRagMetadata } from "@/features/rag/hooks/useRag";
import {
  subjectsForClass,
  chaptersForClassSubject,
} from "@/features/rag/filters";
import type { RagFilters } from "@/features/rag/types";
import type { SelectOption } from "@/shared/types/common";

interface RagFilterPanelProps {
  filters: RagFilters;
  onChange: (next: RagFilters) => void;
  /** Render the chapter dropdown (default true). */
  showChapter?: boolean;
  /**
   * Layout of the select container. Defaults to a responsive grid for use
   * inside a FilterBar; pass `"space-y-4"` for narrow vertical contexts such
   * as the Q&A sidebar/modal.
   */
  className?: string;
}

const DEFAULT_LAYOUT = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

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
  className = DEFAULT_LAYOUT,
}: RagFilterPanelProps) {
  const { data: classData, isLoading: classesLoading } = useRagClassLevels();
  const { data: meta } = useRagMetadata();

  const classValues = sortClassesDescending(classData?.class_levels ?? []);
  const subjectValues = subjectsForClass(meta, filters.class_level);
  const chapterValues = chaptersForClassSubject(
    meta,
    filters.class_level,
    filters.subject,
  );

  const handleClass = (value: string) =>
    onChange({ class_level: value || undefined });

  const handleSubject = (value: string) =>
    onChange({ class_level: filters.class_level, subject: value || undefined });

  const handleChapter = (value: string) =>
    onChange({
      ...filters,
      chapter_name: value ? [value] : undefined,
      title: undefined,
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
        hint={!filters.class_level ? "Select a class first" : undefined}
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
    </div>
  );
}
