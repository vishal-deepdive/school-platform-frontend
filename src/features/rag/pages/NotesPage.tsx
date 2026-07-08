import { useState } from "react";
import { StickyNote } from "lucide-react";
import toast from "@/shared/lib/toast";
import { ragApi } from "@/features/rag/api/rag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { StreamingResultPanel } from "@/features/rag/components/StreamingResultPanel";
import { useStreamBatcher } from "@/features/rag/hooks/useStreamBatcher";
import { getErrorMessage } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useRagUiStore } from "@/features/rag/store/ragUiStore";

export function NotesPage() {
  const { filters, result, isPending } = useRagUiStore((s) => s.notes);
  const setFilters = useRagUiStore((s) => s.setNotesFilters);
  const setPending = useRagUiStore((s) => s.setNotesPending);
  const setResult = useRagUiStore((s) => s.setNotesResult);
  const appendResult = useRagUiStore((s) => s.appendNotesResult);
  const { push: queueToken, flush: flushPending } = useStreamBatcher(appendResult);

  // Holds the error from the last failed run so we can offer a retry.
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setResult("");
    setError(null);
    setPending(true);
    try {
      for await (const event of ragApi.generateNotesStream({ filters })) {
        if (event.type === "token") {
          queueToken(event.content);
        } else if (event.type === "error") {
          flushPending();
          setError(event.message);
          toast.error(event.message);
        } else if (event.type === "done") {
          flushPending();
          toast.success("Lecture notes generated!");
        }
      }
    } catch (err) {
      flushPending();
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      flushPending();
      setPending(false);
    }
  };

  const canGenerate =
    !!filters.class_level &&
    !!filters.subject &&
    !!filters.chapter_name?.length;

  return (
    <div className="space-y-6">
      <FilterBar
        title="Chapter scope"
        icon={<StickyNote className="h-4 w-4" />}
        actions={
          <Button
            onClick={() => generate()}
            loading={isPending}
            disabled={!canGenerate}
            icon={<StickyNote className="h-4 w-4" />}
          >
            {isPending ? "Generating…" : "Generate Notes"}
          </Button>
        }
      >
        <RagFilterPanel filters={filters} onChange={setFilters} showTitle />
        {!canGenerate && (
          <p className="text-xs text-muted-foreground">
            Select a class, subject, and chapter to continue.
          </p>
        )}
      </FilterBar>

      {result !== null || isPending ? (
        <StreamingResultPanel
          error={error}
          isPending={isPending}
          result={result}
          canRetry={canGenerate}
          onRetry={() => generate()}
          Icon={StickyNote}
          title="Lecture Notes"
          pendingMessage="Generating your notes..."
          filename={`notes-${filters.chapter_name?.[0] ?? "chapter"}.md`}
        />
      ) : (
        <EmptyState
          icon={<StickyNote className="h-12 w-12" />}
          title="No notes generated yet"
          description="Pick a class, subject and chapter above, then generate smart notes for the chapter."
        />
      )}
    </div>
  );
}
