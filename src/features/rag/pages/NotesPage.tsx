import { useState } from "react";
import { StickyNote } from "lucide-react";
import toast from "react-hot-toast";
import { ragApi } from "@/features/rag/api/rag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { StreamingResultPanel } from "@/features/rag/components/StreamingResultPanel";
import { useStreamBatcher } from "@/features/rag/hooks/useStreamBatcher";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
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
      <div className={`grid grid-cols-1 gap-6 ${(result !== null || isPending) ? "lg:grid-cols-3" : ""}`}>
        <Card className={(result !== null || isPending) ? "lg:col-span-1" : "w-full"}>
          <CardHeader title="Select Content" />
          <div className="space-y-4">
            <RagFilterPanel filters={filters} onChange={setFilters} />
            <Button
              onClick={() => generate()}
              loading={isPending}
              disabled={!canGenerate}
              icon={<StickyNote className="h-4 w-4" />}
              className="w-full"
            >
              {isPending ? "Generating…" : "Generate Notes"}
            </Button>
            {!canGenerate && (
              <p className="text-xs text-muted-foreground">
                Select a class, subject, and chapter to continue.
              </p>
            )}
          </div>
        </Card>

        {(result !== null || isPending) && (
          <div className="lg:col-span-2">
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
          </div>
        )}
      </div>
    </div>
  );
}
