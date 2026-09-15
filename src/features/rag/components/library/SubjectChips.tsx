import { memo } from "react";
import { cn } from "@/shared/lib/utils";
import { ALL_SUBJECTS } from "@/features/rag/hooks/useLibraryState";
import type { DocumentSubjectSummary } from "@/features/rag/types";

interface SubjectChipsProps {
  subjects: DocumentSubjectSummary[];
  /** A subject name, or ALL_SUBJECTS. */
  selected: string;
  totalCount: number;
  onSelect: (subject: string) => void;
}

/** One-click subject switcher for the selected class. */
export const SubjectChips = memo(function SubjectChips({
  subjects,
  selected,
  totalCount,
  onSelect,
}: SubjectChipsProps) {
  const chips = subjects.map((s) => ({
    value: s.subject,
    label: s.subject,
    count: s.doc_count,
    failed: (s.failed_count ?? 0) > 0,
  }));
  if (subjects.length > 1) {
    chips.unshift({
      value: ALL_SUBJECTS,
      label: "All subjects",
      count: totalCount,
      failed: chips.some((c) => c.failed),
    });
  }

  return (
    <div
      role="group"
      aria-label="Subjects"
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 scrollbar-thin"
    >
      {chips.map((chip) => {
        const active = chip.value === selected;
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(chip.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background text-foreground/80 hover:border-primary/40 hover:text-foreground",
            )}
          >
            {chip.label}
            <span
              className={cn(
                "tabular-nums",
                active ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {chip.count}
            </span>
            {chip.failed && (
              <span
                role="img"
                aria-label="has failed chapters"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  active ? "bg-primary-foreground" : "bg-rose-500",
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});
