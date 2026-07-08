import { useCallback, useEffect, useRef } from "react";

/**
 * Manages the `AbortController` lifecycle for a streaming request so a component
 * never leaks an in-flight stream.
 *
 * - `begin()` aborts any still-running stream and returns a fresh controller —
 *   pass its `.signal` to the stream call.
 * - `stop()` aborts the current stream (wire to a Stop button).
 * - `end(controller)` clears the stored controller, but only if it's still the
 *   active one, so a stale finally-block can't wipe a newer stream's controller.
 * - On unmount the current stream is aborted automatically, so navigating away
 *   cancels the backend generation instead of letting it run to completion.
 */
export function useStreamAbort() {
  const ref = useRef<AbortController | null>(null);

  useEffect(() => () => ref.current?.abort(), []);

  const begin = useCallback(() => {
    ref.current?.abort();
    const controller = new AbortController();
    ref.current = controller;
    return controller;
  }, []);

  const stop = useCallback(() => ref.current?.abort(), []);

  const end = useCallback((controller: AbortController) => {
    if (ref.current === controller) ref.current = null;
  }, []);

  return { begin, stop, end };
}

/** True when an error is the result of an intentional `AbortController.abort()`. */
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
