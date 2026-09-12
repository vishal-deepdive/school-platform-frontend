import type { DocumentItem, DocumentStatusResponse } from "@/features/rag/types";

const TERMINAL = new Set(["completed", "failed"]);

export function isTerminalStatus(status?: string | null): boolean {
  return !!status && TERMINAL.has(status.toLowerCase());
}

export interface ResolvedStatus {
  status: string;
  progress?: string;
  error?: string;
  totalChunks?: number;
}

/**
 * Merge a list row with its live poll sample. The list endpoint is cached, so
 * while the row still looks in flight the live status wins; once the list
 * itself reports a terminal state it's authoritative (the live entry is just
 * the last in-flight sample taken before the refetch).
 */
export function resolveDocumentStatus(
  doc: DocumentItem,
  live?: DocumentStatusResponse,
): ResolvedStatus {
  if (live && !isTerminalStatus(doc.status)) {
    return {
      status: live.status.toLowerCase(),
      progress: live.progress ?? undefined,
      error: live.error ?? doc.error,
      totalChunks: live.total_chunks ?? doc.total_chunks,
    };
  }
  return {
    status: doc.status.toLowerCase(),
    error: doc.error,
    totalChunks: doc.total_chunks,
  };
}

// Pipeline stages in teacher-facing words; the worker's own progress message
// is shown underneath for detail.
const STAGE_LABELS: Record<string, string> = {
  pending: "Queued",
  processing: "Processing",
  parsing: "Reading",
  chunking: "Splitting",
  embedding: "Indexing",
  inserting: "Saving",
};

export function stageLabel(status: string): string {
  return STAGE_LABELS[status] ?? "Processing";
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Natural chapter order ("2" < "10" < "10A"), optionally grouped by subject. */
export function compareChapters(
  a: DocumentItem,
  b: DocumentItem,
  bySubject = false,
): number {
  if (bySubject) {
    const bySubjectName = collator.compare(a.subject, b.subject);
    if (bySubjectName !== 0) return bySubjectName;
  }
  return (
    collator.compare(a.chapter_number, b.chapter_number) ||
    collator.compare(a.chapter_name, b.chapter_name)
  );
}
