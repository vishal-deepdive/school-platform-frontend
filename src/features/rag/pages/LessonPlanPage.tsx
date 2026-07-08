import { useRef, useState } from "react";
import { GraduationCap } from "lucide-react";
import toast from "@/shared/lib/toast";
import { ragApi } from "@/features/rag/api/rag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { StreamingResultPanel } from "@/features/rag/components/StreamingResultPanel";
import { useStreamBatcher } from "@/features/rag/hooks/useStreamBatcher";
import { useStreamAbort, isAbortError } from "@/shared/hooks/useStreamAbort";
import { getErrorMessage } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import type { RagFilters } from "@/features/rag/types";

/**
 * Teacher lesson-plan generator — a ready-to-teach plan (objectives, lesson
 * flow, board work, checks, homework, misconceptions) built from a chapter's
 * indexed content. Mirrors the Notes generator's streaming UX.
 */
export function LessonPlanPage() {
  const [filters, setFilters] = useState<RagFilters>({});
  const [result, setResult] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendResult = (chunk: string) => setResult((prev) => (prev ?? "") + chunk);
  const { push: queueToken, flush: flushPending } = useStreamBatcher(appendResult);
  const { begin, stop, end } = useStreamAbort();
  const streamingRef = useRef(false);

  const canGenerate =
    !!filters.class_level && !!filters.subject && !!filters.chapter_name?.length;

  const generate = async () => {
    if (streamingRef.current) return;
    streamingRef.current = true;
    setResult("");
    setError(null);
    setIsPending(true);
    const controller = begin();
    try {
      for await (const event of ragApi.generateLessonPlanStream(
        { filters },
        controller.signal,
      )) {
        if (event.type === "token") queueToken(event.content);
        else if (event.type === "error") {
          flushPending();
          setError(event.message);
          toast.error(event.message);
        } else if (event.type === "done") {
          flushPending();
          toast.success("Lesson plan ready!");
        }
      }
    } catch (err) {
      flushPending();
      if (!isAbortError(err)) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
      }
    } finally {
      flushPending();
      setIsPending(false);
      streamingRef.current = false;
      end(controller);
    }
  };

  return (
    <div className="space-y-6">
      <FilterBar
        title="Chapter scope"
        icon={<GraduationCap className="h-4 w-4" />}
        actions={
          <Button
            onClick={() => generate()}
            loading={isPending}
            disabled={!canGenerate}
            icon={<GraduationCap className="h-4 w-4" />}
          >
            {isPending ? "Generating…" : "Generate Lesson Plan"}
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
          Icon={GraduationCap}
          title="Lesson Plan"
          pendingMessage="Building your lesson plan..."
          onStop={stop}
          filename={`lesson-plan-${filters.chapter_name?.[0] ?? "chapter"}.md`}
        />
      ) : (
        <EmptyState
          icon={<GraduationCap className="h-12 w-12" />}
          title="No lesson plan yet"
          description="Pick a class, subject and chapter above, then generate a ready-to-teach lesson plan."
        />
      )}
    </div>
  );
}
