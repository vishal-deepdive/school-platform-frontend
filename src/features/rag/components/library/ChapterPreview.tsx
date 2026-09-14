import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  FileSearch,
  FileText,
  Layers,
  Link2,
  Link2Off,
  SearchX,
} from "lucide-react";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/shared/components/ui/SegmentedControl";
import { Skeleton, SkeletonText } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import { useDocumentMarkdown } from "@/features/rag/hooks/useRag";
import { DocumentChunksPreview } from "./DocumentChunksPreview";
import { MarkdownPage } from "./MarkdownPage";
import { HoverBus, useSignal } from "./preview/hoverBus";
import { usePaneView, usePreviewScrollSync } from "./preview/scrollSync";
import { blockForRange, findBestMatch, MIN_MATCH_SCORE } from "./preview/textAlign";

// pdf.js is heavy and only needed once someone opens a preview with a PDF.
const PdfPane = lazy(() => import("./PdfPane").then((m) => ({ default: m.PdfPane })));

type Mode = "text" | "split" | "pdf" | "passages";

/** Pages this far outside the visible range keep their rendered markdown. */
const RENDER_WINDOW = 2;
/** Below this, windowing costs more than it saves. */
const WINDOW_THRESHOLD = 12;
/** Grace period before a highlight clears, so crossing a gap does not flicker. */
const LEAVE_DELAY = 110;
/** Let the pointer settle before the other pane chases the match. */
const AUTO_SCROLL_DELAY = 130;

interface ChapterPreviewProps {
  documentId: string;
}

/**
 * Chapter preview: the parsed text and the original PDF side by side.
 *
 * Two things are deliberately kept out of React state, because both fire far
 * too often to render through:
 *
 *  - **Scrolling** is owned by `PreviewScrollSync`, which couples the panes by
 *    writing `scrollTop` inside one rAF per frame. React only hears about a
 *    pane when its integer page changes.
 *  - **Hovering** is owned by `HoverBus`. A hovered markdown block is matched
 *    into the PDF's text layer (and vice versa) and highlighted by the single
 *    component that owns the match.
 */
export function ChapterPreview({ documentId }: ChapterPreviewProps) {
  const { data, isLoading, isError, error } = useDocumentMarkdown(documentId);
  const [mode, setMode] = useState<Mode>("text");
  const [syncScroll, setSyncScroll] = useState(true);
  const [hoverSync, setHoverSync] = useState(true);

  const sync = usePreviewScrollSync();
  const bus = useMemo(() => new HoverBus(), []);
  const textRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | null>(null);
  const revealTimer = useRef<number | null>(null);

  const pages = data?.pages ?? [];
  const hasNumberedPages = pages.some((p) => p.page > 0);
  const totalPages = pages.length;
  const canPdf = !!data?.has_source && data.source_media_type === "application/pdf";
  const splitting = mode === "split";

  // Default to side-by-side when there is a PDF, unless the reader chose a view.
  const userPicked = useRef(false);
  useEffect(() => {
    if (!userPicked.current && canPdf) setMode("split");
  }, [canPdf]);
  useEffect(() => {
    if (!canPdf && (mode === "split" || mode === "pdf")) setMode("text");
  }, [canPdf, mode]);

  const textView = usePaneView(sync, "text");
  const pdfView = usePaneView(sync, "pdf");
  const currentPage = mode === "pdf" ? pdfView.page : textView.page;

  // ── Wiring ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    return sync.attach("text", el);
  }, [sync, mode, isLoading]);

  useEffect(() => {
    sync.setEnabled(syncScroll && splitting);
  }, [sync, syncScroll, splitting]);

  const clearHover = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    leaveTimer.current = null;
    revealTimer.current = null;
    bus.setTarget(null);
  }, [bus]);

  // Hover reflection only makes sense while both panes are on screen.
  useEffect(() => {
    if (!hoverSync || !splitting) clearHover();
  }, [hoverSync, splitting, clearHover]);

  useEffect(() => () => clearHover(), [clearHover]);

  // ── Hover reflection ──────────────────────────────────────────────────────
  /** Cancel a pending clear — the pointer only crossed a gap between blocks. */
  const holdOpen = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  /** Markdown → PDF: the block is already the unit both panes agree on. */
  const handleHoverBlock = useCallback(
    (page: number, blockId: string, query: string) => {
      holdOpen();
      bus.setTarget({ page, blockId, query, source: "text" });
    },
    [bus, holdOpen],
  );

  /**
   * PDF → markdown: resolve the hovered window to the markdown block that
   * produced it, then republish *that block's* text as the shared query. Both
   * panes then highlight the same paragraph rather than two loosely related
   * fragments — and the PDF highlight covers the whole block, the way
   * LlamaParse reflects a selection.
   */
  const handleHoverText = useCallback(
    (page: number, snippet: string) => {
      holdOpen();
      const markdown = bus.pageIndex(page);
      const match = markdown ? findBestMatch(markdown.index.text, snippet) : null;
      const block =
        markdown && match && match.score >= MIN_MATCH_SCORE
          ? blockForRange(markdown.blocks, match.start, match.end)
          : null;

      if (!block || !markdown) {
        // No markdown for this page (not rendered, or nothing matched): still
        // highlight what the pointer is actually over.
        bus.setTarget({ page, blockId: null, query: snippet, source: "pdf" });
        return;
      }

      bus.setTarget({
        page,
        blockId: block.el.dataset.blockId ?? null,
        query: markdown.index.text.slice(block.start, block.end),
        source: "pdf",
      });

      if (revealTimer.current) clearTimeout(revealTimer.current);
      const el = block.el;
      revealTimer.current = window.setTimeout(() => {
        const scroller = textRef.current;
        if (!scroller || !el.isConnected) return;
        const top =
          el.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop;
        sync.reveal("text", top, el.offsetHeight);
      }, AUTO_SCROLL_DELAY);
    },
    [bus, sync, holdOpen],
  );

  const handleLeaveHover = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => bus.setTarget(null), LEAVE_DELAY);
  }, [bus]);

  // ── Page navigation ───────────────────────────────────────────────────────
  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return;
      sync.scrollToPage(page);
    },
    [sync, totalPages],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "PageDown" || (e.altKey && e.key === "ArrowRight")) {
        goToPage(currentPage + 1);
      } else if (e.key === "PageUp" || (e.altKey && e.key === "ArrowLeft")) {
        goToPage(currentPage - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPage, currentPage]);

  const pickMode = (next: Mode) => {
    userPicked.current = true;
    clearHover();
    setMode(next);
  };

  const modeOptions: SegmentOption<Mode>[] = [
    { value: "text", label: "Text", icon: <FileText className="h-3.5 w-3.5" /> },
    ...(canPdf
      ? ([
          { value: "split", label: "Side by side", icon: <Columns2 className="h-3.5 w-3.5" /> },
          { value: "pdf", label: "PDF", icon: <FileSearch className="h-3.5 w-3.5" /> },
        ] as SegmentOption<Mode>[])
      : []),
    { value: "passages", label: "Passages", icon: <Layers className="h-3.5 w-3.5" /> },
  ];

  if (isError) {
    return <Alert variant="error">{getErrorMessage(error) || "Failed to load this chapter."}</Alert>;
  }

  return (
    <div className="flex h-[82vh] min-h-[560px] min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label="Preview layout"
            compact
            options={modeOptions}
            value={mode}
            onChange={pickMode}
          />

          {hasNumberedPages && totalPages > 1 && mode !== "passages" && (
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-1.5 py-0.5">
              <Tooltip content="Previous page (Alt + Left)">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>

              <span className="px-1 text-xs font-medium tabular-nums text-foreground">
                Page <span className="font-semibold text-primary">{currentPage}</span> of{" "}
                {totalPages}
              </span>

              <Tooltip content="Next page (Alt + Right)">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {splitting && (
            <>
              <MatchChip bus={bus} enabled={hoverSync} />
              <ToggleChip
                checked={syncScroll}
                onChange={setSyncScroll}
                label="Sync scroll"
                tooltip="Keep both panes on the same page while you scroll"
                icon={
                  syncScroll ? (
                    <Link2 className="h-3 w-3" />
                  ) : (
                    <Link2Off className="h-3 w-3" />
                  )
                }
              />
              <ToggleChip
                checked={hoverSync}
                onChange={setHoverSync}
                label="Hover link"
                tooltip="Point at any text to highlight the matching words in the other pane"
              />
            </>
          )}

          <StatLine
            loading={isLoading}
            items={[
              {
                value: pages.length,
                label: hasNumberedPages
                  ? pages.length === 1
                    ? "page"
                    : "pages"
                  : pages.length === 1
                    ? "section"
                    : "sections",
              },
              {
                label: "rebuilt from passages",
                tone: "warning",
                hidden: data?.source !== "chunks",
              },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <PaneShell>
            <div className="space-y-4 p-4">
              <SkeletonText lines={4} />
              <SkeletonText lines={5} />
            </div>
          </PaneShell>
          <PaneShell className="hidden lg:flex">
            <div className="p-3">
              <Skeleton className="h-72 w-full" />
            </div>
          </PaneShell>
        </div>
      ) : pages.length === 0 && mode !== "passages" ? (
        <EmptyState
          icon={<SearchX className="h-10 w-10" />}
          title="No readable text"
          description="This chapter has no extracted text yet — it may still be processing, or it failed to parse."
        />
      ) : (
        <div className={cn("grid min-h-0 flex-1 gap-3", splitting && "lg:grid-cols-2")}>
          {(mode === "text" || splitting) && (
            <PaneShell>
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-card px-3 py-1.5">
                <p className="truncate text-xs text-muted-foreground">
                  {hasNumberedPages ? (
                    <>
                      Parsed text · page{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {textView.page}
                      </span>{" "}
                      of <span className="tabular-nums">{totalPages}</span>
                    </>
                  ) : (
                    "Parsed text"
                  )}
                </p>
                {data?.parser_name && (
                  <Badge variant="default" className="shrink-0 font-mono text-[10px]">
                    {data.parser_name}
                  </Badge>
                )}
              </div>

              <div
                ref={textRef}
                className="relative min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin"
              >
                {/* One wrapper the sync controller can watch for height changes. */}
                <div className="space-y-5">
                  {pages.map((page, i) => (
                    <MarkdownPage
                      key={`${page.page}-${i}`}
                      page={page}
                      pageIndex={i}
                      isVisible={isPageInWindow(
                        page.page,
                        textView.first,
                        textView.last,
                        totalPages,
                        hasNumberedPages,
                      )}
                      hoverSyncEnabled={hoverSync && splitting}
                      bus={bus}
                      sync={sync}
                      onHoverBlock={handleHoverBlock}
                      onLeave={handleLeaveHover}
                    />
                  ))}
                </div>
              </div>
            </PaneShell>
          )}

          {(mode === "pdf" || splitting) && canPdf && (
            <PaneShell>
              <Suspense
                fallback={
                  <div className="p-3">
                    <Skeleton className="h-72 w-full" />
                  </div>
                }
              >
                <PdfPane
                  className="min-h-0 flex-1"
                  documentId={documentId}
                  sync={sync}
                  bus={bus}
                  hoverSyncEnabled={hoverSync && splitting}
                  onHoverText={handleHoverText}
                  onLeaveHover={handleLeaveHover}
                />
              </Suspense>
            </PaneShell>
          )}

          {mode === "passages" && (
            <PaneShell>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
                <DocumentChunksPreview documentId={documentId} />
              </div>
            </PaneShell>
          )}
        </div>
      )}
    </div>
  );
}

/** Keep rendered markdown near the viewport; collapse the rest to placeholders. */
function isPageInWindow(
  page: number,
  first: number,
  last: number,
  total: number,
  numbered: boolean,
) {
  if (!numbered || total <= WINDOW_THRESHOLD) return true;
  if (page < 1) return true;
  return page >= first - RENDER_WINDOW && page <= last + RENDER_WINDOW;
}

/** Compact toolbar switch — the preview has no room for full checkboxes. */
function ToggleChip({
  checked,
  onChange,
  label,
  tooltip,
  icon,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  tooltip: string;
  icon?: React.ReactNode;
}) {
  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
          checked
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border/60 bg-card text-muted-foreground hover:bg-muted/50",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            checked ? "bg-primary" : "bg-muted-foreground/40",
          )}
        />
        {icon}
        {label}
      </button>
    </Tooltip>
  );
}

/**
 * Live feedback on the hover alignment. Its own subscriber so the rest of the
 * toolbar never re-renders while the pointer moves.
 */
function MatchChip({ bus, enabled }: { bus: HoverBus; enabled: boolean }) {
  const status = useSignal(bus.status);
  if (!enabled || status === "idle") return null;
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-1 text-[11px] font-medium",
        status === "matched"
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-amber-400/40 bg-amber-50/70 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      )}
    >
      {status === "matched" ? "Aligned" : "No match on this page"}
    </span>
  );
}

/** Bordered, self-scrolling pane — the dialog body never scrolls in this view. */
function PaneShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
