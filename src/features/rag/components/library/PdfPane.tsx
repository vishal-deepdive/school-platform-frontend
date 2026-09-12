import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { FileWarning, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { cn } from "@/shared/lib/utils";
import { ragApi } from "@/features/rag/api/rag";
import { useDominantPage } from "./useDominantPage";

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

interface PdfPaneProps {
  documentId: string;
  /** Page the text pane wants shown (1-based); 0 means "don't steer". */
  targetPage?: number;
  /** Changes whenever the text pane asks again, even for the same page. */
  targetNonce?: number;
  onVisiblePageChange?: (page: number) => void;
  /** Called on real user scrolling, so the parent knows which pane leads. */
  onUserScroll?: () => void;
  className?: string;
}

/** The original chapter PDF, rendered page by page beside the parsed text. */
export function PdfPane({
  documentId,
  targetPage,
  targetNonce,
  onVisiblePageChange,
  onUserScroll,
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

  // ── Follow the text pane ─────────────────────────────────────────────────
  useEffect(() => {
    if (!targetPage || targetPage < 1 || sizes.length === 0) return;
    const root = scrollRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-page="${targetPage}"]`);
    if (root && el) root.scrollTo({ top: Math.max(0, el.offsetTop - 12) });
  }, [targetPage, targetNonce, sizes.length]);

  const pageWidth = Math.max(220, Math.round((paneWidth - 28) * zoom));
  const totalPages = pdf?.numPages ?? 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
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
        onScroll={onUserScroll}
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
 * One page. The placeholder always occupies the page's real height so the
 * scrollbar is honest before anything renders, and the canvas only exists while
 * the page is near the viewport — a 40-page chapter would otherwise hold tens
 * of megabytes of bitmaps at once.
 */
function PdfPageView({
  pdf,
  pageNumber,
  width,
  aspect,
  active,
  observer,
}: {
  pdf: PDFDocumentProxy | null;
  pageNumber: number;
  width: number;
  aspect: number;
  active: boolean;
  observer: IntersectionObserver | null;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const height = Math.round(width * aspect);

  useEffect(() => {
    const el = holderRef.current;
    if (!el || !observer) return;
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [observer]);

  useEffect(() => {
    if (!active || !pdf) return;
    let cancelled = false;
    let task: { cancel: () => void } | undefined;

    (async () => {
      const page = await pdf.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const base = page.getViewport({ scale: 1 });
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const viewport = page.getViewport({ scale: (width / base.width) * ratio });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const renderTask = page.render({ canvasContext: context, viewport });
      task = renderTask;
      try {
        await renderTask.promise;
      } catch {
        // Cancelled by the cleanup below (scrolled away or re-zoomed).
      }
      page.cleanup();
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [active, pdf, pageNumber, width]);

  return (
    <div
      ref={holderRef}
      data-page={pageNumber}
      style={{ width, height }}
      className="relative shrink-0 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/10"
    >
      {active ? (
        <canvas ref={canvasRef} style={{ width, height }} className="block" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs tabular-nums text-slate-400">
          {pageNumber}
        </span>
      )}
    </div>
  );
}
