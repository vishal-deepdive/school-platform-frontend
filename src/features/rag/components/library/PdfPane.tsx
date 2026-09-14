import { useCallback, useEffect, useRef, useState } from "react";
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
import { usePageTarget, type HoverBus } from "./preview/hoverBus";
import { usePaneView, type PreviewScrollSync } from "./preview/scrollSync";
import {
  boxesForRange,
  buildIndex,
  findBestMatch,
  rangeOfElement,
  unionBox,
  MIN_MATCH_SCORE,
  type BoundingBox,
  type CompactIndex,
} from "./preview/textAlign";

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
/** Context around the hovered span handed to the matcher, in characters. */
const HOVER_LOOKBEHIND = 90;
const HOVER_LOOKAHEAD = 160;
/** Let the pointer settle before chasing the match with a smooth scroll. */
const AUTO_SCROLL_DELAY = 130;

interface PdfPaneProps {
  documentId: string;
  sync: PreviewScrollSync;
  bus: HoverBus;
  hoverSyncEnabled: boolean;
  /** Hovered PDF text, already widened to a matchable window. */
  onHoverText: (page: number, query: string) => void;
  onLeaveHover: () => void;
  className?: string;
}

/** The original chapter PDF, rendered page by page beside the parsed text. */
export function PdfPane({
  documentId,
  sync,
  bus,
  hoverSyncEnabled,
  onHoverText,
  onLeaveHover,
  className,
}: PdfPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<{ width: number; height: number }[]>([]);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [paneWidth, setPaneWidth] = useState(0);

  const view = usePaneView(sync, "pdf");

  // ── Load the file, then measure every page ────────────────────────────────
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

        // Page one decides the initial layout for the whole file, so the first
        // page paints immediately instead of after N round-trips to the worker.
        const first = await loaded.getPage(1);
        const base = first.getViewport({ scale: 1 });
        first.cleanup();
        if (cancelled) return;
        const provisional = { width: base.width, height: base.height };
        setSizes(new Array(loaded.numPages).fill(provisional));

        if (loaded.numPages === 1) return;
        const measured: { width: number; height: number }[] = [provisional];
        let mixed = false;
        for (let n = 2; n <= loaded.numPages; n++) {
          const page = await loaded.getPage(n);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1 });
          page.cleanup();
          measured.push({ width: viewport.width, height: viewport.height });
          if (viewport.width !== base.width || viewport.height !== base.height) mixed = true;
        }
        // Uniform page sizes are the norm; only pay for a re-layout when they
        // actually differ.
        if (mixed) setSizes(measured);
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

  // ── Register with the scroll controller ───────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return sync.attach("pdf", el);
  }, [sync]);

  // Page geometry changes with the zoom level and the measured page sizes.
  useEffect(() => {
    sync.invalidate("pdf");
  }, [sync, zoom, paneWidth, sizes]);

  // ── Fit to the pane, times the reader's zoom ──────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setPaneWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setPaneWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageWidth = Math.max(220, Math.round((paneWidth - 28) * zoom));
  const totalPages = pdf?.numPages ?? 0;

  const handleLeave = useCallback(() => onLeaveHover(), [onLeaveHover]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-card px-3 py-1.5">
        <p className="truncate text-xs text-muted-foreground">
          {totalPages > 0 ? (
            <>
              Original file · page{" "}
              <span className="font-semibold tabular-nums text-foreground">{view.page}</span> of{" "}
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
        onPointerLeave={handleLeave}
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
                    pageNumber >= view.first - RENDER_WINDOW &&
                    pageNumber <= view.last + RENDER_WINDOW
                  }
                  sync={sync}
                  bus={bus}
                  hoverSyncEnabled={hoverSyncEnabled}
                  onHoverText={onHoverText}
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
 * One page: a canvas for the bitmap, plus pdf.js's real text layer on top for
 * selection and hover alignment.
 *
 * The text layer is indexed once per render into compact form; every hover then
 * costs one string search and one `Range.getClientRects()`, which is what makes
 * the highlight land on the exact words rather than on whole spans.
 */
function PdfPageView({
  pdf,
  pageNumber,
  width,
  aspect,
  active,
  sync,
  bus,
  hoverSyncEnabled,
  onHoverText,
}: {
  pdf: PDFDocumentProxy | null;
  pageNumber: number;
  width: number;
  aspect: number;
  active: boolean;
  sync: PreviewScrollSync;
  bus: HoverBus;
  hoverSyncEnabled: boolean;
  onHoverText: (page: number, query: string) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<CompactIndex | null>(null);
  /** Bumped whenever the text layer is rebuilt, to re-run the match. */
  const [layerVersion, setLayerVersion] = useState(0);

  const height = Math.round(width * aspect);

  // ── Render canvas + text layer ────────────────────────────────────────────
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

        if (textLayerDiv) {
          textLayerDiv.replaceChildren();
          textLayerDiv.style.setProperty("--scale-factor", String(scaleFactor));
          try {
            textLayerInstance = new pdfjs.TextLayer({
              textContentSource: page.streamTextContent(),
              container: textLayerDiv,
              viewport: cssViewport,
            });
            await textLayerInstance.render();
            if (cancelled) return;
            indexRef.current = buildIndex(textLayerDiv);
            setLayerVersion((v) => v + 1);
          } catch {
            // Cancelled, or the worker aborted mid-stream.
          }
        }

        page.cleanup();
      } catch {
        // Cancelled by unmount or a re-render at a different width.
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayerInstance?.cancel();
    };
  }, [active, pdf, pageNumber, width]);

  // Freed pages keep no index.
  useEffect(() => {
    if (!active) indexRef.current = null;
  }, [active]);

  // ── Pointer tracking over the text layer ──────────────────────────────────
  const handlePointerOver = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!hoverSyncEnabled || sync.isScrolling()) return;
    const index = indexRef.current;
    if (!index) return;

    const span = (event.target as HTMLElement | null)?.closest<HTMLElement>("span");
    if (!span || !span.textContent?.trim()) return;

    const range = rangeOfElement(index, span);
    if (!range) return;

    // A span is often a handful of characters; widen it to a readable window so
    // the matcher has enough signal to find the right paragraph.
    const query = index.text.slice(
      Math.max(0, range.start - HOVER_LOOKBEHIND),
      Math.min(index.text.length, range.end + HOVER_LOOKAHEAD),
    );
    if (query.length >= 12) onHoverText(pageNumber, query);
  };

  return (
    <div
      ref={holderRef}
      data-page={pageNumber}
      onPointerOver={handlePointerOver}
      style={{ width, height }}
      className="relative shrink-0 select-text overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/10"
    >
      {active ? (
        <>
          <canvas ref={canvasRef} style={{ width, height }} className="pointer-events-none block" />
          <div
            ref={textLayerRef}
            className="textLayer"
            style={{ position: "absolute", inset: 0, width, height, overflow: "hidden" }}
          />

          {hoverSyncEnabled && (
            <PageHighlight
              key={layerVersion}
              bus={bus}
              sync={sync}
              pageNumber={pageNumber}
              indexRef={indexRef}
              holderRef={holderRef}
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

/**
 * The highlight overlay for one rendered page.
 *
 * Split out from `PdfPageView` on purpose: this is the only component that
 * subscribes to the hover bus, so a pointer move re-renders a handful of
 * absolutely-positioned divs and nothing else — not the canvas, not the text
 * layer, and not the page shells of the rest of the chapter.
 */
function PageHighlight({
  bus,
  sync,
  pageNumber,
  indexRef,
  holderRef,
}: {
  bus: HoverBus;
  sync: PreviewScrollSync;
  pageNumber: number;
  indexRef: React.MutableRefObject<CompactIndex | null>;
  holderRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  /** Where the last match landed, so repeated boilerplate resolves forwards. */
  const hintRef = useRef(0);
  const revealTimer = useRef<number | null>(null);
  const target = usePageTarget(bus, pageNumber);

  useEffect(() => {
    if (revealTimer.current) {
      clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }

    const index = indexRef.current;
    const holder = holderRef.current;
    if (!target?.query || !index || !holder) {
      setBoxes([]);
      return;
    }

    const match = findBestMatch(index.text, target.query, hintRef.current);
    if (!match || match.score < MIN_MATCH_SCORE) {
      hintRef.current = 0;
      setBoxes([]);
      bus.setStatus("unmatched");
      return;
    }

    hintRef.current = match.start;
    const lines = boxesForRange(index, match.start, match.end, holder);
    setBoxes(lines);
    bus.setStatus(lines.length > 0 ? "matched" : "unmatched");

    // Follow the highlight only when the reader is pointing at the other pane.
    if (target.source !== "text" || lines.length === 0) return;
    const union = unionBox(lines);
    const pageTop = sync.pageTop("pdf", pageNumber);
    if (!union || pageTop === null) return;
    revealTimer.current = window.setTimeout(() => {
      sync.reveal("pdf", pageTop + union.top, union.height);
    }, AUTO_SCROLL_DELAY);
  }, [target, bus, sync, pageNumber, indexRef, holderRef]);

  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    [],
  );

  return (
    <>
      {boxes.map((box, i) => (
        <div
          key={i}
          style={{
            top: box.top - 1.5,
            left: box.left - 1.5,
            width: box.width + 3,
            height: box.height + 3,
          }}
          className={cn(
            "pointer-events-none absolute z-[2] rounded-[2px]",
            // Multiply keeps the glyphs underneath legible instead of washing
            // them out the way an opaque overlay would.
            "bg-primary/30 ring-1 ring-inset ring-primary/50 mix-blend-multiply",
            "animate-in fade-in duration-100",
          )}
        />
      ))}
    </>
  );
}
