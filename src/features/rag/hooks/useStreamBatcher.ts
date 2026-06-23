import { useCallback, useEffect, useRef } from "react";

/** Cap Markdown re-renders at ~30fps — smooth for streaming text without
 *  re-parsing the whole answer on every token. */
const DEFAULT_INTERVAL_MS = 33;

/**
 * Batches streamed text chunks and flushes the concatenated result via
 * `onFlush` at most once per `intervalMs`.
 *
 * SSE token streams can emit dozens of chunks per second; without batching,
 * each chunk triggers a store update and a full re-render (including a Markdown
 * re-parse + KaTeX pass over the entire accumulated text), which makes the page
 * unresponsive as the content grows. Coalescing flushes to a fixed cadence keeps
 * re-renders steady and display-refresh-independent regardless of token rate.
 */
export function useStreamBatcher(
  onFlush: (chunk: string) => void,
  intervalMs: number = DEFAULT_INTERVAL_MS,
) {
  const pendingRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current) {
      const chunk = pendingRef.current;
      pendingRef.current = "";
      onFlush(chunk);
    }
  }, [onFlush]);

  const push = useCallback(
    (chunk: string) => {
      pendingRef.current += chunk;
      if (timerRef.current === null) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          flush();
        }, intervalMs);
      }
    },
    [flush, intervalMs],
  );

  useEffect(() => () => flush(), [flush]);

  return { push, flush };
}
