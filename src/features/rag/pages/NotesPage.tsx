import { StickyNote, Download } from "lucide-react";
import toast from "react-hot-toast";
import { ragApi } from "@/features/rag/api/rag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { useStreamBatcher } from "@/features/rag/hooks/useStreamBatcher";
import { getErrorMessage, downloadFile } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { useRagUiStore } from "@/features/rag/store/ragUiStore";

export function NotesPage() {
  const { filters, result, isPending } = useRagUiStore((s) => s.notes);
  const setFilters = useRagUiStore((s) => s.setNotesFilters);
  const setPending = useRagUiStore((s) => s.setNotesPending);
  const setResult = useRagUiStore((s) => s.setNotesResult);
  const appendResult = useRagUiStore((s) => s.appendNotesResult);
  const { push: queueToken, flush: flushPending } = useStreamBatcher(appendResult);

  const generate = async () => {
    setResult("");
    setPending(true);
    try {
      for await (const event of ragApi.generateNotesStream({ filters })) {
        if (event.type === "token") {
          queueToken(event.content);
        } else if (event.type === "error") {
          flushPending();
          toast.error(event.message);
        } else if (event.type === "done") {
          flushPending();
          toast.success("Lecture notes generated!");
        }
      }
    } catch (err) {
      flushPending();
      toast.error(getErrorMessage(err));
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
            {result !== null ? (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Lecture Notes</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Download className="h-4 w-4" />}
                    onClick={() =>
                      downloadFile(
                        result,
                        `notes-${filters.chapter_name?.[0] ?? "chapter"}.md`,
                      )
                    }
                  >
                    Download
                  </Button>
                </div>
                <div className="overflow-y-auto max-h-[65vh] rounded-lg bg-muted/40 p-4">
                  {isPending ? (
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">
                      {result}
                    </pre>
                  ) : (
                    <MarkdownRenderer content={result} />
                  )}
                </div>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 py-12 text-muted-foreground">
                  <div className="animate-spin">
                    <StickyNote className="h-8 w-8" />
                  </div>
                  <p>Generating your notes...</p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
