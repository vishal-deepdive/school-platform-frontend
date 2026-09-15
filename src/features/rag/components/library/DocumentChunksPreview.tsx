import { FileText } from "lucide-react";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SkeletonText } from "@/shared/components/ui/Skeleton";
import { getErrorMessage } from "@/shared/lib/utils";
import { useDocumentChunks } from "@/features/rag/hooks/useRag";

/** Loads and renders the indexed passages of a document inside the preview modal. */
export function DocumentChunksPreview({ documentId }: { documentId: string }) {
  const { data, isLoading, isError, error } = useDocumentChunks(documentId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border/50 p-3">
            <SkeletonText lines={3} />
          </div>
        ))}
      </div>
    );
  }
  if (isError) {
    return <Alert variant="error">{getErrorMessage(error)}</Alert>;
  }
  if (!data || data.chunks.length === 0) {
    return (
      <EmptyState
        variant="plain"
        icon={<FileText className="h-10 w-10" />}
        title="No indexed content"
        description="This chapter has no passages yet. It may still be processing, or it failed to parse."
      />
    );
  }

  // The modal body scrolls (header and footer stay pinned), so no inner scroller.
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.total} indexed passage{data.total === 1 ? "" : "s"} — exactly what
        answers can cite.
      </p>
      {data.chunks.map((chunk, i) => (
        <div
          key={chunk.chunk_id ?? i}
          className="rounded-lg border border-border/60 bg-muted/30 p-3"
        >
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {chunk.title && <Badge variant="primary">{chunk.title}</Badge>}
            {chunk.page && (
              <span className="text-[11px] text-muted-foreground">p. {chunk.page}</span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {chunk.content}
          </p>
        </div>
      ))}
    </div>
  );
}
