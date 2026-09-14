import { useCallback, useSyncExternalStore } from "react";
import type { BlockIndex } from "./textAlign";

/**
 * The shared hover state of the side-by-side preview, kept outside React.
 *
 * Hovering is a high-frequency gesture: routing it through component state
 * would re-render every rendered page (and re-run react-markdown) on each
 * pointer move. Instead both panes read this bus — the markdown pane subscribes
 * imperatively and toggles a class, the PDF pane subscribes per page and only
 * the one page that owns the match re-renders.
 */

export type HoverSource = "text" | "pdf";

export interface HoverTarget {
  /** Source page both panes agree on (1-based). */
  page: number;
  /** `data-block-id` of the markdown block, when one was resolved. */
  blockId: string | null;
  /** Compact text of that block — the canonical query for both panes. */
  query: string;
  /** Pane the pointer is in; the *other* pane is the one that auto-scrolls. */
  source: HoverSource;
}

class Signal<T> {
  private listeners = new Set<() => void>();

  constructor(private value: T) {}

  get = (): T => this.value;

  set(next: T) {
    if (Object.is(next, this.value)) return;
    this.value = next;
    this.listeners.forEach((cb) => cb());
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
}

export type MatchStatus = "idle" | "matched" | "unmatched";

export class HoverBus {
  readonly target = new Signal<HoverTarget | null>(null);
  /** Whether the PDF pane could place the current target — drives the chip. */
  readonly status = new Signal<MatchStatus>("idle");

  /** Markdown block indexes for the pages currently rendered, by page number. */
  private pages = new Map<number, BlockIndex>();

  setTarget(next: HoverTarget | null) {
    const prev = this.target.get();
    if (
      prev &&
      next &&
      prev.page === next.page &&
      prev.source === next.source &&
      prev.blockId === next.blockId &&
      prev.query === next.query
    ) {
      return;
    }
    if (!prev && !next) return;
    // The pane that owns the match reports back once it has recomputed.
    this.status.set("idle");
    this.target.set(next);
  }

  setStatus(status: MatchStatus) {
    // Only the live target may report; a late callback from a stale page must
    // not flip the chip back on after the pointer left.
    if (status !== "idle" && !this.target.get()) return;
    this.status.set(status);
  }

  registerPage(page: number, index: BlockIndex) {
    this.pages.set(page, index);
  }

  unregisterPage(page: number) {
    this.pages.delete(page);
  }

  pageIndex(page: number): BlockIndex | undefined {
    return this.pages.get(page);
  }
}

/** Read a signal from React, re-rendering only when its value actually changes. */
export function useSignal<T>(signal: {
  get: () => T;
  subscribe: (cb: () => void) => () => void;
}): T {
  return useSyncExternalStore(signal.subscribe, signal.get);
}

/**
 * The hover target, but only when it concerns `page`.
 *
 * The snapshot collapses to `null` for every other page, so React skips the
 * re-render entirely — a chapter with 200 rendered page shells costs one
 * comparison each per hover, not 200 renders.
 */
export function usePageTarget(bus: HoverBus, page: number): HoverTarget | null {
  const getSnapshot = useCallback(() => {
    const target = bus.target.get();
    return target && target.page === page ? target : null;
  }, [bus, page]);
  return useSyncExternalStore(bus.target.subscribe, getSnapshot);
}
