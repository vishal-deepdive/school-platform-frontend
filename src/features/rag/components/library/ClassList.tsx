import { memo } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Select } from "@/shared/components/ui/Select";
import { cn } from "@/shared/lib/utils";
import type { DocumentClassSummary } from "@/features/rag/types";

interface ClassListProps {
  classes: DocumentClassSummary[];
  selected: string;
  onSelect: (classLevel: string) => void;
}

function Readiness({ cls }: { cls: DocumentClassSummary }) {
  const failed = cls.failed_count ?? 0;
  const processing = cls.doc_count - cls.completed_count - failed;
  if (failed > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300">
        <AlertCircle className="h-3 w-3" />
        {failed} failed
      </span>
    );
  }
  if (processing > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        {processing} processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" />
      Ready
    </span>
  );
}

/** Master list of the library's classes; a dropdown below the lg breakpoint. */
export const ClassList = memo(function ClassList({
  classes,
  selected,
  onSelect,
}: ClassListProps) {
  return (
    <>
      <div className="lg:hidden">
        <Select
          aria-label="Class"
          options={classes.map((c) => ({
            value: c.class_level,
            label: `${c.class_level} · ${c.doc_count} ${c.doc_count === 1 ? "chapter" : "chapters"}`,
          }))}
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
        />
      </div>

      <nav
        aria-label="Classes"
        className="hidden rounded-xl border border-border/60 bg-card p-1.5 lg:sticky lg:top-0 lg:block lg:self-start"
      >
        <p className="eyebrow px-2.5 pb-1.5 pt-1 text-muted-foreground">Classes</p>
        <ul className="space-y-0.5">
          {classes.map((cls) => {
            const active = cls.class_level === selected;
            return (
              <li key={cls.class_level}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelect(cls.class_level)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary/10 text-primary dark:bg-primary/20"
                      : "text-foreground hover:bg-muted/70",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-sm", active ? "font-semibold" : "font-medium")}>
                      {cls.class_level}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {cls.doc_count}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>
                      {cls.subjects.length} {cls.subjects.length === 1 ? "subject" : "subjects"}
                    </span>
                    <Readiness cls={cls} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
});
