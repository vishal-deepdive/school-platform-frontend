import { memo, useEffect, useRef, useState } from "react";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { cn } from "@/shared/lib/utils";
import type { DocumentPage } from "@/features/rag/types";
import { findBestMatchingMarkdownBlock } from "./hoverSyncUtils";

interface MarkdownPageProps {
  page: DocumentPage;
  pageIndex: number;
  isVisible: boolean;
  hoverSyncEnabled: boolean;
  activeHover: {
    source: "markdown" | "pdf" | null;
    page: number;
    text?: string;
    blockId?: string;
  } | null;
  onHoverBlock?: (page: number, blockId: string, text: string) => void;
  onLeaveBlock?: () => void;
}

/**
 * Renders a single page of extracted Markdown with:
 * 1. Virtualization: unrendered placeholder when far from viewport.
 * 2. Block-level tagging for bidirectional hover sync with PDF.
 * 3. Smooth active highlight reflection when matching text is hovered.
 */
export const MarkdownPage = memo(function MarkdownPage({
  page,
  pageIndex,
  isVisible,
  hoverSyncEnabled,
  activeHover,
  onHoverBlock,
  onLeaveBlock,
}: MarkdownPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cachedHeight, setCachedHeight] = useState<number>(0);
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);

  // Measure and cache real rendered height so placeholder preserves exact scroll space.
  useEffect(() => {
    if (containerRef.current && isVisible) {
      const h = containerRef.current.offsetHeight;
      if (h > 50) {
        setCachedHeight(h);
      }
    }
  }, [isVisible]);

  // Tag top-level blocks inside markdown for quick lookup and matching.
  useEffect(() => {
    if (!isVisible || !containerRef.current) return;
    const blocks = containerRef.current.querySelectorAll<HTMLElement>(
      ".prose > p, .prose > h1, .prose > h2, .prose > h3, .prose > h4, .prose > h5, .prose > h6, .prose > ul > li, .prose > ol > li, .prose > blockquote, .prose > table, .prose > div",
    );
    blocks.forEach((el, i) => {
      if (!el.dataset.blockId) {
        el.dataset.blockId = `p${page.page}-b${i}`;
        el.dataset.page = String(page.page);
        el.classList.add("transition-all", "duration-150", "rounded", "relative");
      }
    });
  }, [isVisible, page.page, page.markdown]);

  // Handle hover targeting from PDF.
  useEffect(() => {
    if (!hoverSyncEnabled || !containerRef.current) {
      if (activeElement) {
        activeElement.classList.remove(
          "bg-primary/10",
          "ring-2",
          "ring-primary/60",
          "border-l-4",
          "border-primary",
          "px-1.5",
          "-mx-1.5",
        );
        setActiveElement(null);
      }
      return;
    }

    if (activeHover && activeHover.source === "pdf" && activeHover.page === page.page && activeHover.text) {
      const match = findBestMatchingMarkdownBlock(containerRef.current, activeHover.text);
      if (match && match !== activeElement) {
        if (activeElement) {
          activeElement.classList.remove(
            "bg-primary/10",
            "ring-2",
            "ring-primary/60",
            "border-l-4",
            "border-primary",
            "px-1.5",
            "-mx-1.5",
          );
        }
        match.classList.add(
          "bg-primary/10",
          "ring-2",
          "ring-primary/60",
          "border-l-4",
          "border-primary",
          "px-1.5",
          "-mx-1.5",
        );
        setActiveElement(match);
      }
    } else if (activeElement && (!activeHover || activeHover.page !== page.page)) {
      activeElement.classList.remove(
        "bg-primary/10",
        "ring-2",
        "ring-primary/60",
        "border-l-4",
        "border-primary",
        "px-1.5",
        "-mx-1.5",
      );
      setActiveElement(null);
    }
  }, [activeHover, hoverSyncEnabled, page.page, activeElement]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverSyncEnabled || !onHoverBlock) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const block = target.closest<HTMLElement>("[data-block-id]");
    if (!block || !block.dataset.blockId) return;

    if (block === activeElement && activeHover?.source === "markdown") return;

    if (activeElement && activeElement !== block) {
      activeElement.classList.remove(
        "bg-primary/10",
        "ring-2",
        "ring-primary/60",
        "border-l-4",
        "border-primary",
        "px-1.5",
        "-mx-1.5",
      );
    }

    block.classList.add(
      "bg-primary/10",
      "ring-2",
      "ring-primary/60",
      "border-l-4",
      "border-primary",
      "px-1.5",
      "-mx-1.5",
    );
    setActiveElement(block);

    const text = block.textContent?.trim() ?? "";
    if (text) {
      onHoverBlock(page.page, block.dataset.blockId, text);
    }
  };

  const handleMouseLeave = () => {
    if (activeElement) {
      activeElement.classList.remove(
        "bg-primary/10",
        "ring-2",
        "ring-primary/60",
        "border-l-4",
        "border-primary",
        "px-1.5",
        "-mx-1.5",
      );
      setActiveElement(null);
    }
    onLeaveBlock?.();
  };

  return (
    <section
      ref={containerRef}
      data-page={page.page > 0 ? page.page : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={!isVisible && cachedHeight ? { minHeight: cachedHeight } : undefined}
      className={cn(
        "border-t border-border/40 pt-5 first:border-t-0 first:pt-0 transition-opacity duration-200",
        !isVisible && "opacity-60",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {page.page > 0 ? `Page ${page.page}` : "Unplaced text"}
        </p>
        <span className="text-[10px] tabular-nums text-muted-foreground/60">
          Section #{pageIndex + 1}
        </span>
      </div>

      {isVisible ? (
        <MarkdownRenderer content={page.markdown} />
      ) : (
        <div className="flex flex-col gap-2 py-4">
          <div className="h-4 w-3/4 rounded bg-muted/60 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-muted/50 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted/40 animate-pulse" />
        </div>
      )}
    </section>
  );
});
