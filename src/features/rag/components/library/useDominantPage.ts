import { useEffect, useRef, useState } from "react";

export interface PageRange {
  first: number;
  last: number;
}

/**
 * Tracks which `[data-page]` child of a scroll container the reader is looking
 * at, for the side-by-side preview.
 *
 * Returns the visible `range` (used by the PDF pane to decide which pages are
 * worth keeping rendered) and the `observer` itself, so children that mount and
 * unmount as the window moves can register themselves. Children already in the
 * DOM are observed automatically, so a static pane needs nothing else.
 */
export function useDominantPage(
  rootRef: React.RefObject<HTMLElement | null>,
  itemCount: number,
  onDominant?: (page: number) => void,
  /** Rebuild the observer when the pane itself is swapped out (e.g. a layout
   *  change remounts the scroller behind the same ref). */
  resetKey?: unknown,
) {
  const [observer, setObserver] = useState<IntersectionObserver | null>(null);
  const [range, setRange] = useState<PageRange>({ first: 1, last: 1 });
  // Kept in a ref so a new callback identity doesn't tear down the observer.
  const onDominantRef = useRef(onDominant);
  useEffect(() => {
    onDominantRef.current = onDominant;
  }, [onDominant]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || itemCount === 0) return;

    const ratios = new Map<number, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const page = Number((entry.target as HTMLElement).dataset.page);
          if (!Number.isFinite(page)) continue;
          if (entry.isIntersecting) ratios.set(page, entry.intersectionRatio);
          else ratios.delete(page);
        }
        if (ratios.size === 0) return;
        const pages = [...ratios.keys()].sort((a, b) => a - b);
        // "Dominant" = whichever visible page fills the most of the viewport,
        // so a page peeking in at the edge doesn't drag the other pane along.
        let dominant = pages[0];
        let best = -1;
        ratios.forEach((ratio, page) => {
          if (ratio > best) {
            best = ratio;
            dominant = page;
          }
        });
        setRange({ first: pages[0], last: pages[pages.length - 1] });
        onDominantRef.current?.(dominant);
      },
      { root, rootMargin: "120px 0px", threshold: [0, 0.2, 0.5, 0.8, 1] },
    );

    root.querySelectorAll<HTMLElement>("[data-page]").forEach((el) => io.observe(el));
    setObserver(io);
    return () => {
      io.disconnect();
      setObserver(null);
    };
  }, [rootRef, itemCount, resetKey]);

  return { observer, range };
}
