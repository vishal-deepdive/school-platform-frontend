import { useCallback, useEffect, useRef } from "react";

/**
 * Batches streamed text chunks and flushes the concatenated result via
 * `onFlush` at most once per animation frame.
 *
 * SSE token streams can emit dozens of chunks per second; without batching,
 * each chunk triggers a store update and a full re-render (including a
 * Markdown re-parse of the entire accumulated text), which makes the page
 * unresponsive as the content grows. Capping flushes to one per frame keeps
 * re-renders at a steady ~60fps regardless of token rate.
 */
export function useStreamBatcher(onFlush: (chunk: string) => void) {
  const pendingRef = useRef("");
  const rafRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
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
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          flush();
        });
      }
    },
    [flush],
  );

  useEffect(() => () => flush(), [flush]);

  return { push, flush };
}
