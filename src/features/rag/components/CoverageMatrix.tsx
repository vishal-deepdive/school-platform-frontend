import { useMemo } from "react";
import { Grid3x3 } from "lucide-react";
import { Panel } from "@/shared/components/ui/Panel";
import { cn, sortClassesDescending } from "@/shared/lib/utils";
import { useRagMetadata } from "@/features/rag/hooks/useRag";
import {
  subjectsForClass,
  chaptersForClassSubject,
} from "@/features/rag/filters";

/**
 * Class × Subject coverage grid built from the `/metadata` hierarchy. Each cell
 * shows how many chapters are indexed for that (class, subject) pair; empty
 * cells are highlighted so staff can see exactly where the knowledge base has
 * gaps and what to upload next. No extra network call — reuses the cached
 * metadata that already drives the filter dropdowns.
 */
export function CoverageMatrix() {
  const { data: meta } = useRagMetadata();

  const { classes, subjects, counts } = useMemo(() => {
    const hierarchy = meta?.hierarchy ?? {};
    const classList = sortClassesDescending(Object.keys(hierarchy));
    const subjectSet = new Set<string>();
    for (const cls of classList) {
      for (const subj of subjectsForClass(meta, cls)) subjectSet.add(subj);
    }
    const subjectList = Array.from(subjectSet).sort();

    const cellCounts: Record<string, Record<string, number>> = {};
    for (const cls of classList) {
      cellCounts[cls] = {};
      for (const subj of subjectList) {
        cellCounts[cls][subj] = chaptersForClassSubject(meta, cls, subj).length;
      }
    }
    return { classes: classList, subjects: subjectList, counts: cellCounts };
  }, [meta]);

  if (!classes.length || !subjects.length) return null;

  return (
    <Panel
      flush
      icon={<Grid3x3 className="h-4 w-4" />}
      title="Coverage map"
      description="Chapters indexed per class and subject — empty cells are gaps"
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class
              </th>
              {subjects.map((subj) => (
                <th
                  key={subj}
                  className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground"
                >
                  <span className="block max-w-[7rem] truncate" title={subj}>
                    {subj}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => (
              <tr key={cls} className="border-t border-border/40">
                <th className="sticky left-0 z-10 bg-card px-4 py-2 text-left text-sm font-medium text-foreground">
                  {cls}
                </th>
                {subjects.map((subj) => {
                  const n = counts[cls]?.[subj] ?? 0;
                  return (
                    <td key={subj} className="px-2 py-2 text-center">
                      <span
                        className={cn(
                          "inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-medium tabular-nums",
                          n > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/60 text-muted-foreground/50",
                        )}
                        title={
                          n > 0
                            ? `${n} chapter${n === 1 ? "" : "s"}`
                            : "No content"
                        }
                      >
                        {n > 0 ? n : "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
