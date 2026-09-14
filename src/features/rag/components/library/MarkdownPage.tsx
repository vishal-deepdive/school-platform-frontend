import { memo, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { cn } from "@/shared/lib/utils";
import type { DocumentPage } from "@/features/rag/types";
import type { HoverBus } from "./preview/hoverBus";
import type { PreviewScrollSync } from "./preview/scrollSync";
import { buildBlockIndex, type BlockIndex, type BlockSpan } from "./preview/textAlign";

interface MarkdownPageProps {
  page: DocumentPage;
  pageIndex: number;
  /** False while the page is outside the render window (placeholder only). */
  isVisible: boolean;
  hoverSyncEnabled: boolean;
  bus: HoverBus;
  sync: PreviewScrollSync;
  onHoverBlock: (page: number, blockId: string, query: string) => void;
  onLeave: () => void;
}

/**
 * Highlight for the hovered / reflected block. `outline` rather than a border
 * so nothing reflows when it appears — a border would nudge every line below
 * it and fight the scroll sync.
 */
const HIGHLIGHT = [
  "bg-primary/10",
  "outline",
  "outline-2",
  "outline-primary/40",
  "outline-offset-2",
  "rounded",
];

/**
 * One page of parsed markdown.
 *
 * Pages outside the render window collapse to a placeholder holding the height
 * they last measured (or an estimate, before they have ever rendered), so
 * scrolling a 200-page chapter stays cheap without the scrollbar lurching.
 *
 * Hover state deliberately never enters React here: the component subscribes to
 * the bus and toggles a class on the matched block. Re-rendering instead would
 * mean re-running react-markdown (KaTeX, GFM tables, syntax highlighting) on
 * every pointer move.
 */
export const MarkdownPage = memo(function MarkdownPage({
  page,
  pageIndex,
  isVisible,
  hoverSyncEnabled,
  bus,
  sync,
  onHoverBlock,
  onLeave,
}: MarkdownPageProps) {
  const rootRef = useRef<HTMLElement>(null);
  const indexRef = useRef<{ index: BlockIndex; byEl: Map<HTMLElement, BlockSpan> } | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  // Before a page has ever rendered there is nothing to measure, and a
  // zero-height placeholder would make the scrollbar lurch the first time the
  // reader reaches it. Prose height tracks character count closely enough for
  // the estimate to hold the right amount of space.
  const estimatedHeight = useMemo(
    () => Math.min(2400, Math.max(220, Math.round(page.markdown.length * 0.42))),
    [page.markdown],
  );
  const placeholderHeight = measuredHeight || estimatedHeight;

  // ── Index the rendered blocks ─────────────────────────────────────────────
  useEffect(() => {
    const root = rootRef.current;
    const pageNumber = page.page;
    if (!root || !isVisible || pageNumber < 1) {
      indexRef.current = null;
      return;
    }

    const index = buildBlockIndex(root);
    const byEl = new Map<HTMLElement, BlockSpan>();
    index.blocks.forEach((block, i) => {
      block.el.dataset.blockId = `p${pageNumber}-b${i}`;
      byEl.set(block.el, block);
    });
    indexRef.current = { index, byEl };
    bus.registerPage(pageNumber, index);

    // The page just changed height; the sync controller must re-measure.
    sync.invalidate("text");
    const height = root.offsetHeight;
    if (height > 40) setMeasuredHeight(height);

    return () => {
      bus.unregisterPage(pageNumber);
      indexRef.current = null;
    };
  }, [bus, sync, isVisible, page.page, page.markdown]);

  // Collapsing back to a placeholder also moves everything below it.
  useEffect(() => {
    if (!isVisible) sync.invalidate("text");
  }, [isVisible, sync]);

  // ── Reflected highlight, applied straight to the DOM ──────────────────────
  useEffect(() => {
    const pageNumber = page.page;
    let highlighted: HTMLElement | null = null;

    const clear = () => {
      highlighted?.classList.remove(...HIGHLIGHT);
      highlighted = null;
    };

    const apply = () => {
      const target = bus.target.get();
      if (!hoverSyncEnabled || !target || target.page !== pageNumber || !target.blockId) {
        clear();
        return;
      }
      const next = rootRef.current?.querySelector<HTMLElement>(
        `[data-block-id="${CSS.escape(target.blockId)}"]`,
      );
      if (next === highlighted) return;
      clear();
      if (next) {
        next.classList.add(...HIGHLIGHT);
        highlighted = next;
      }
    };

    apply();
    const unsubscribe = bus.target.subscribe(apply);
    return () => {
      unsubscribe();
      clear();
    };
  }, [bus, hoverSyncEnabled, page.page, isVisible]);

  // ── Pointer tracking ──────────────────────────────────────────────────────
  // `pointerover` fires once per element entered, so this is already change
  // driven — no throttling of a per-pixel `mousemove` stream needed.
  const handlePointerOver = (event: React.PointerEvent<HTMLElement>) => {
    if (!hoverSyncEnabled || page.page < 1 || sync.isScrolling()) return;
    const built = indexRef.current;
    if (!built) return;

    const block = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-block-id]");
    if (!block) return;
    const span = built.byEl.get(block);
    if (!span || !block.dataset.blockId) return;

    onHoverBlock(
      page.page,
      block.dataset.blockId,
      built.index.index.text.slice(span.start, span.end),
    );
  };

  return (
    <section
      ref={rootRef}
      data-page={page.page > 0 ? page.page : undefined}
      onPointerOver={handlePointerOver}
      onPointerLeave={onLeave}
      style={!isVisible ? { height: placeholderHeight } : undefined}
      className={cn(
        "border-t border-border/40 pt-5 first:border-t-0 first:pt-0",
        !isVisible && "overflow-hidden",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {page.page > 0 ? `Page ${page.page}` : "Unplaced text"}
        </p>
        <span className="text-[10px] tabular-nums text-muted-foreground/60">
          Section {pageIndex + 1}
        </span>
      </div>

      {isVisible ? (
        <MarkdownRenderer content={page.markdown} />
      ) : (
        <div className="space-y-2.5 py-1" aria-hidden>
          <div className="h-3 w-11/12 rounded bg-muted/70" />
          <div className="h-3 w-full rounded bg-muted/50" />
          <div className="h-3 w-4/5 rounded bg-muted/40" />
          <div className="h-3 w-2/3 rounded bg-muted/30" />
        </div>
      )}
    </section>
  );
});
