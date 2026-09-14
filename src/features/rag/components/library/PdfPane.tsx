import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";
import { FileWarning, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { cn } from "@/shared/lib/utils";
import { ragApi } from "@/features/rag/api/rag";
import { useDominantPage } from "./useDominantPage";
import {
  extractKeywords,
  getUnionBoundingBox,
  type BoundingBox,
  type HoverState,
} from "./hoverSyncUtils";

// pdf.js renders in a worker; this module is lazy-loaded, so the worker chunk
// only ships to people who actually open a preview.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const ZOOM_STEP = 0.2;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3;
/** Pages this far outside the viewport keep their canvas; the rest are freed. */
const RENDER_WINDOW = 1;
/** A full-page canvas at 3x would be ~25 MP — 2x is already retina-sharp. */
const MAX_PIXEL_RATIO = 2;

export interface ScrollProgress {
  page: number;
  progress: number;
  nonce?: number;
}

interface PdfPaneProps {
  documentId: string;
  /** Proportional sub-page scroll target from the text pane */
  targetProgress?: ScrollProgress | null;
  /** Page the text pane wants shown (1-based); 0 means "don't steer". */
  targetPage?: number;
  /** Changes whenever the text pane asks again, even for the same page. */
  targetNonce?: number;
  onVisiblePageChange?: (page: number) => void;
  onScrollProgress?: (progress: { page: number; progress: number }) => void;
  /** Called on real user scrolling, so the parent knows which pane leads. */
  onUserScroll?: () => void;
  hoverSyncEnabled?: boolean;
  activeHover?: HoverState | null;
  onHoverTarget?: (target: { source: "pdf"; page: number; text: string; rect?: BoundingBox }) => void;
  onLeaveHover?: () => void;
  className?: string;
}

/** The original chapter PDF, rendered page by page beside the parsed text. */
export function PdfPane({
  documentId,
  targetProgress,
  targetPage,
  targetNonce,
  onVisiblePageChange,
  onScrollProgress,
  onUserScroll,
  hoverSyncEnabled = true,
  activeHover,
  onHoverTarget,
  onLeaveHover,
  className,
}: PdfPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<{ width: number; height: number }[]>([]);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [paneWidth, setPaneWidth] = useState(0);

  const { observer, range } = useDominantPage(scrollRef, sizes.length, onVisiblePageChange);

  // ── Load the file and measure every page once ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    const controller = new AbortController();
    setFailed(false);
    setPdf(null);
    setSizes([]);

    (async () => {
      try {
        const buffer = await ragApi.getDocumentSource(documentId, controller.signal);
        if (cancelled) return;
        // pdf.js takes ownership of the array it is handed.
        loaded = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
        if (cancelled) {
          void loaded.destroy();
          return;
        }
        setPdf(loaded);

        const measured: { width: number; height: number }[] = [];
        for (let n = 1; n <= loaded.numPages; n++) {
          const page = await loaded.getPage(n);
          const viewport = page.getViewport({ scale: 1 });
          measured.push({ width: viewport.width, height: viewport.height });
          page.cleanup();
          if (cancelled) return;
        }
        setSizes(measured);
      } catch {
        // Aborting on unmount lands here too — only a live pane shows the error.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      void loaded?.destroy();
    };
  }, [documentId]);

  // ── Fit to the pane, times the user's zoom ────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setPaneWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setPaneWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Follow continuous scroll progress from text pane ─────────────────────
  useEffect(() => {
    if (!targetProgress || targetProgress.page < 1 || sizes.length === 0) return;
    const root = scrollRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-page="${targetProgress.page}"]`);
    if (el) {
      const top = el.offsetTop + targetProgress.progress * el.offsetHeight;
      root.scrollTop = Math.max(0, top);
    }
  }, [targetProgress, sizes.length]);

  // ── Follow discrete page jump target ─────────────────────────────────────
  useEffect(() => {
    if (!targetPage || targetPage < 1 || sizes.length === 0) return;
    const root = scrollRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-page="${targetPage}"]`);
    if (root && el) root.scrollTo({ top: Math.max(0, el.offsetTop - 12) });
  }, [targetPage, targetNonce, sizes.length]);

  // ── Report scroll progress on user-driven scrolling ──────────────────────
  const handleScroll = useCallback(() => {
    onUserScroll?.();
    if (!onScrollProgress) return;
    const root = scrollRef.current;
    if (!root || sizes.length === 0) return;

    const scrollTop = root.scrollTop;
    const pageEls = root.querySelectorAll<HTMLElement>("[data-page]");
    for (let i = 0; i < pageEls.length; i++) {
      const el = pageEls[i];
      const top = el.offsetTop;
      const bottom = top + el.offsetHeight;
      if (scrollTop >= top && scrollTop < bottom) {
        const page = Number(el.dataset.page);
        const progress = (scrollTop - top) / Math.max(1, el.offsetHeight);
        onScrollProgress({ page, progress });
        return;
      }
    }
  }, [onUserScroll, onScrollProgress, sizes.length]);

  const pageWidth = Math.max(220, Math.round((paneWidth - 28) * zoom));
  const totalPages = pdf?.numPages ?? 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5 bg-card">
        <p className="truncate text-xs text-muted-foreground">
          {totalPages > 0 ? (
            <>
              Original file · page{" "}
              <span className="font-semibold tabular-nums text-foreground">{range.first}</span> of{" "}
              <span className="tabular-nums">{totalPages}</span>
            </>
          ) : failed ? (
            "Original file"
          ) : (
            "Loading the original file…"
          )}
        </p>
        {totalPages > 0 && (
          <div className="flex shrink-0 items-center gap-0.5">
            <span className="mr-1 text-[11px] tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Tooltip content="Zoom out" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Zoom out"
                disabled={zoom <= MIN_ZOOM}
                onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
            <Tooltip content="Fit to width" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Fit to width"
                onClick={() => setZoom(1)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
            <Tooltip content="Zoom in" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Zoom in"
                disabled={zoom >= MAX_ZOOM}
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative min-h-0 flex-1 overflow-auto bg-muted/40 p-3 scrollbar-thin"
      >
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <FileWarning className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">Original file unavailable</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              It may have been removed from storage since this chapter was indexed. The parsed text
              is still available.
            </p>
          </div>
        ) : sizes.length === 0 ? (
          <div className="mx-auto max-w-[46rem] space-y-3">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <div className="mx-auto flex w-fit flex-col items-center gap-3">
            {sizes.map((size, i) => {
              const pageNumber = i + 1;
              return (
                <PdfPageView
                  key={pageNumber}
                  pdf={pdf}
                  pageNumber={pageNumber}
                  width={pageWidth}
                  aspect={size.height / size.width}
                  active={
                    pageNumber >= range.first - RENDER_WINDOW &&
                    pageNumber <= range.last + RENDER_WINDOW
                  }
                  observer={observer}
                  hoverSyncEnabled={hoverSyncEnabled}
                  activeHover={activeHover}
                  onHoverTarget={onHoverTarget}
                  onLeaveHover={onLeaveHover}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One page: Canvas for bitmap rendering + TextLayer for selection & hover sync.
 */
function PdfPageView({
  pdf,
  pageNumber,
  width,
  aspect,
  active,
  observer,
  hoverSyncEnabled,
  activeHover,
  onHoverTarget,
  onLeaveHover,
}: {
  pdf: PDFDocumentProxy | null;
  pageNumber: number;
  width: number;
  aspect: number;
  active: boolean;
  observer: IntersectionObserver | null;
  hoverSyncEnabled: boolean;
  activeHover?: HoverState | null;
  onHoverTarget?: (target: { source: "pdf"; page: number; text: string; rect?: BoundingBox }) => void;
  onLeaveHover?: () => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [highlightBox, setHighlightBox] = useState<BoundingBox | null>(null);
  const height = Math.round(width * aspect);

  useEffect(() => {
    const el = holderRef.current;
    if (!el || !observer) return;
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [observer]);

  // ── Render Canvas + PDF.js TextLayer ──────────────────────────────────────
  useEffect(() => {
    if (!active || !pdf) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | undefined;
    let textLayerInstance: pdfjs.TextLayer | undefined;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const base = page.getViewport({ scale: 1 });
        const scaleFactor = width / base.width;
        const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
        const canvasViewport = page.getViewport({ scale: scaleFactor * ratio });
        const cssViewport = page.getViewport({ scale: scaleFactor });

        canvas.width = Math.floor(canvasViewport.width);
        canvas.height = Math.floor(canvasViewport.height);

        renderTask = page.render({ canvasContext: context, viewport: canvasViewport });
        await renderTask.promise;
        if (cancelled) return;

        // Render real DOM text layer over canvas for hover & selection
        if (textLayerDiv) {
          textLayerDiv.innerHTML = "";
          textLayerDiv.style.setProperty("--scale-factor", String(scaleFactor));
          try {
            const textSource = page.streamTextContent();
            textLayerInstance = new pdfjs.TextLayer({
              textContentSource: textSource,
              container: textLayerDiv,
              viewport: cssViewport,
            });
            await textLayerInstance.render();
          } catch {
            // Cancelled or worker aborted
          }
        }

        page.cleanup();
      } catch {
        // Cancelled by unmount or re-render
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayerInstance?.cancel();
    };
  }, [active, pdf, pageNumber, width]);

  // ── Hover reflection: When Markdown is hovered, find matching spans on PDF ──
  useEffect(() => {
    if (!hoverSyncEnabled || !holderRef.current || !textLayerRef.current) {
      setHighlightBox(null);
      return;
    }

    if (activeHover && activeHover.source === "markdown" && activeHover.page === pageNumber && activeHover.text) {
      const textLayerDiv = textLayerRef.current;
      const spans = Array.from(textLayerDiv.querySelectorAll<HTMLSpanElement>("span"));
      if (spans.length === 0) {
        setHighlightBox(null);
        return;
      }

      const keywords = extractKeywords(activeHover.text, 3);
      if (keywords.length === 0) {
        setHighlightBox(null);
        return;
      }

      const matchedSpans: HTMLElement[] = [];
      for (const span of spans) {
        const spanText = span.textContent?.toLowerCase() || "";
        if (keywords.some((kw) => spanText.includes(kw))) {
          matchedSpans.push(span);
        }
      }

      if (matchedSpans.length > 0) {
        const box = getUnionBoundingBox(matchedSpans, holderRef.current);
        setHighlightBox(box);
      } else {
        setHighlightBox(null);
      }
    } else {
      setHighlightBox(null);
    }
  }, [activeHover, hoverSyncEnabled, pageNumber]);

  // ── Handle hovering over PDF text layer spans ─────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverSyncEnabled || !onHoverTarget) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const span = target.closest<HTMLSpanElement>("span");
    if (!span || !span.textContent?.trim()) return;

    const text = span.textContent.trim();
    if (text.length >= 2) {
      const box = holderRef.current ? getUnionBoundingBox([span], holderRef.current) : null;
      onHoverTarget({
        source: "pdf",
        page: pageNumber,
        text,
        rect: box ?? undefined,
      });
    }
  };

  return (
    <div
      ref={holderRef}
      data-page={pageNumber}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onLeaveHover?.()}
      style={{ width, height }}
      className="relative shrink-0 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/10 select-text"
    >
      {active ? (
        <>
          <canvas ref={canvasRef} style={{ width, height }} className="block pointer-events-none" />
          <div
            ref={textLayerRef}
            className="textLayer"
            style={{
              position: "absolute",
              inset: 0,
              width,
              height,
              overflow: "hidden",
            }}
          />
          {highlightBox && (
            <div
              style={{
                position: "absolute",
                top: Math.max(0, highlightBox.top - 2),
                left: Math.max(0, highlightBox.left - 4),
                width: Math.min(width, highlightBox.width + 8),
                height: Math.min(height, highlightBox.height + 4),
              }}
              className="pointer-events-none z-10 rounded border-2 border-primary bg-primary/20 shadow-md ring-2 ring-primary/40 transition-all duration-150 animate-in fade-in"
            />
          )}
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs tabular-nums text-slate-400">
          Page {pageNumber}
        </span>
      )}
    </div>
  );
}
