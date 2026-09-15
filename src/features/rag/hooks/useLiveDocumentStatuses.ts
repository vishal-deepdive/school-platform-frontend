import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateRagLibrary,
  useRagDocumentStatuses,
} from "@/features/rag/hooks/useRag";
import {
  isTerminalStatus,
  resolveDocumentStatus,
} from "@/features/rag/lib/documentStatus";
import type { DocumentItem, DocumentStatusResponse } from "@/features/rag/types";

const POLL_MS = 3000;

type LiveMap = Record<string, DocumentStatusResponse>;

function sameSample(a: DocumentStatusResponse | undefined, b: DocumentStatusResponse) {
  return (
    !!a &&
    a.status === b.status &&
    a.progress === b.progress &&
    a.error === b.error &&
    a.total_chunks === b.total_chunks
  );
}

/**
 * Live ingest status for the rows on screen: one batched request per tick, no
 * matter how many chapters are processing (the list endpoint is cached, so it
 * can't be polled for this).
 *
 * Samples live in local state rather than being read straight off the query:
 * a row that turns terminal drops out of the polled id set (changing the query
 * key), and its last sample has to survive until the list refetch catches up.
 * Whenever a row finishes, the library queries refetch once.
 */
export function useLiveDocumentStatuses(items: DocumentItem[]) {
  const queryClient = useQueryClient();
  const [live, setLive] = useState<LiveMap>({});

  const pendingIds = useMemo(
    () =>
      items
        .filter((doc) => !isTerminalStatus(resolveDocumentStatus(doc, live[doc.id]).status))
        .map((doc) => doc.id)
        .sort(),
    [items, live],
  );

  const { data } = useRagDocumentStatuses(pendingIds, POLL_MS);

  useEffect(() => {
    if (!data?.items.length) return;
    let finished = false;
    let next: LiveMap | null = null;
    for (const sample of data.items) {
      const prev = live[sample.document_id];
      if (sameSample(prev, sample)) continue;
      if (isTerminalStatus(sample.status) && !isTerminalStatus(prev?.status)) {
        finished = true;
      }
      next ??= { ...live };
      next[sample.document_id] = sample;
    }
    if (!next) return;
    setLive(next);
    if (finished) void invalidateRagLibrary(queryClient);
  }, [data, live, queryClient]);

  /** Drop a row's sample (e.g. after a retry) so it's polled afresh. */
  const forget = useCallback((id: string) => {
    setLive((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return { live, forget };
}
