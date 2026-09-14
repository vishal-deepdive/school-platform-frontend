import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  FileSearch,
  FileText,
  Layers,
  SearchX,
  Sparkles,
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
import { useDominantPage } from "./useDominantPage";
import type { BoundingBox, HoverState } from "./hoverSyncUtils";
import type { ScrollProgress } from "./PdfPane";

// pdf.js is heavy and only needed once someone opens a preview with a PDF.
const PdfPane = lazy(() => import("./PdfPane").then((m) => ({ default: m.PdfPane })));

type Mode = "text" | "split" | "pdf" | "passages";

interface ChapterPreviewProps {
  documentId: string;
}

/**
 * Chapter preview: the parsed text and original PDF side by side, kept in
 * fluid continuous step as either side scrolls. Features LlamaParse-style
 * bidirectional hover reflection and virtualization for instant loading.
 */
export function ChapterPreview({ documentId }: ChapterPreviewProps) {
  const { data, isLoading, isError, error } = useDocumentMarkdown(documentId);
  const [mode, setMode] = useState<Mode>("text");
  const [syncScroll, setSyncScroll] = useState(true);
  const [hoverSync, setHoverSync] = useState(true);

  // Leader tracks which pane the user is actively interacting with.
  const leader = useRef<"text" | "pdf" | null>(null);
  const isProgrammaticScroll = useRef(false);
  const [pdfScrollTarget, setPdfScrollTarget] = useState<ScrollProgress | null>(null);

  // Hover synchronization state (LlamaParse-style reflection)
  const [activeHover, setActiveHover] = useState<HoverState | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const textRef = useRef<HTMLDivElement>(null);
  const pages = data?.pages ?? [];
  const hasNumberedPages = pages.some((p) => p.page > 0);
  const totalPages = pages.length;
  const canPdf = !!data?.has_source && data.source_media_type === "application/pdf";
  const splitting = mode === "split";

  // Default to side-by-side when there's a PDF, unless the reader chose a view.
  const userPicked = useRef(false);
  useEffect(() => {
    if (!userPicked.current && canPdf) setMode("split");
  }, [canPdf]);
  useEffect(() => {
    if (!canPdf && (mode === "split" || mode === "pdf")) setMode("text");
  }, [canPdf, mode]);

  const { range: textRange } = useDominantPage(textRef, totalPages, undefined, mode);

  // ── Continuous Proportional Scroll Sync ──────────────────────────────────
  const handleTextScroll = () => {
    if (isProgrammaticScroll.current) return;
    if (!syncScroll || !splitting || leader.current !== "text") return;

    const root = textRef.current;
    if (!root) return;
    const scrollTop = root.scrollTop;
    const pageEls = root.querySelectorAll<HTMLElement>("[data-page]");

    for (let i = 0; i < pageEls.length; i++) {
      const el = pageEls[i];
      const top = el.offsetTop;
      const bottom = top + el.offsetHeight;
      if (scrollTop >= top && scrollTop < bottom) {
        const page = Number(el.dataset.page);
        if (page > 0) {
          const progress = (scrollTop - top) / Math.max(1, el.offsetHeight);
          setPdfScrollTarget({ page, progress, nonce: Date.now() });
        }
        break;
      }
    }
  };

  const handlePdfScrollProgress = useCallback(
    (prog: { page: number; progress: number }) => {
      if (isProgrammaticScroll.current) return;
      if (!syncScroll || !splitting || leader.current !== "pdf") return;

      const root = textRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(`[data-page="${prog.page}"]`);
      if (el) {
        isProgrammaticScroll.current = true;
        const targetTop = el.offsetTop + prog.progress * el.offsetHeight;
        root.scrollTop = Math.max(0, targetTop);
        requestAnimationFrame(() => {
          isProgrammaticScroll.current = false;
        });
      }
    },
    [syncScroll, splitting],
  );

  // ── Jump to Page ─────────────────────────────────────────────────────────
  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages) return;
      setPdfScrollTarget({ page: targetPage, progress: 0, nonce: Date.now() });

      const root = textRef.current;
      if (root) {
        const el = root.querySelector<HTMLElement>(`[data-page="${targetPage}"]`);
        if (el) {
          isProgrammaticScroll.current = true;
          root.scrollTo({ top: Math.max(0, el.offsetTop - 12), behavior: "smooth" });
          setTimeout(() => {
            isProgrammaticScroll.current = false;
          }, 300);
        }
      }
    },
    [totalPages],
  );

  // Keyboard navigation for page jumping: Left / Right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "PageDown" || (e.altKey && e.key === "ArrowRight")) {
        goToPage(Math.min(totalPages, textRange.first + 1));
      } else if (e.key === "PageUp" || (e.altKey && e.key === "ArrowLeft")) {
        goToPage(Math.max(1, textRange.first - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPage, textRange.first, totalPages]);

  // ── Bidirectional Hover Reflection ───────────────────────────────────────
  const handleHoverBlock = useCallback(
    (page: number, blockId: string, text: string) => {
      if (!hoverSync) return;
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setActiveHover({ source: "markdown", page, blockId, text });
    },
    [hoverSync],
  );

  const handleHoverPdfTarget = useCallback(
    (target: { source: "pdf"; page: number; text: string; rect?: BoundingBox }) => {
      if (!hoverSync) return;
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setActiveHover(target);
    },
    [hoverSync],
  );

  const handleLeaveHover = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = window.setTimeout(() => {
      setActiveHover(null);
    }, 90);
  }, []);

  const pickMode = (next: Mode) => {
    userPicked.current = true;
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

  const currentPageNum = Math.max(1, Math.min(totalPages, textRange.first));

  return (
    <div className="flex h-[82vh] min-h-[560px] min-w-0 flex-col gap-3">
      {/* Top Header & Interactive Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label="Preview layout"
            compact
            options={modeOptions}
            value={mode}
            onChange={pickMode}
          />

          {hasNumberedPages && totalPages > 1 && (
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-1.5 py-0.5">
              <Tooltip content="Previous page (Alt + Left)">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded"
                  disabled={currentPageNum <= 1}
                  onClick={() => goToPage(currentPageNum - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>

              <span className="px-1 text-xs font-medium tabular-nums text-foreground">
                Page <span className="font-semibold text-primary">{currentPageNum}</span> of {totalPages}
              </span>

              <Tooltip content="Next page (Alt + Right)">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded"
                  disabled={currentPageNum >= totalPages}
                  onClick={() => goToPage(currentPageNum + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {splitting && (
            <div className="flex items-center gap-2">
              <Tooltip content="Synchronize scrolling between Text and PDF">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={syncScroll}
                    onChange={(e) => setSyncScroll(e.target.checked)}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-primary"
                  />
                  Sync scrolling
                </label>
              </Tooltip>

              <Tooltip content="Highlight matching text across both panes on hover (LlamaParse-style)">
                <label className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  hoverSync
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-muted/50",
                )}>
                  <input
                    type="checkbox"
                    checked={hoverSync}
                    onChange={(e) => setHoverSync(e.target.checked)}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-primary"
                  />
                  <Sparkles className="h-3 w-3" />
                  Hover sync
                </label>
              </Tooltip>
            </div>
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
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5 bg-card">
                <p className="truncate text-xs text-muted-foreground">
                  {hasNumberedPages ? (
                    <>
                      Parsed text · page{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {currentPageNum}
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
                onScroll={handleTextScroll}
                onPointerEnter={() => {
                  leader.current = "text";
                }}
                className="relative min-h-0 flex-1 space-y-5 overflow-y-auto p-4 scrollbar-thin"
              >
                {pages.map((page, i) => {
                  // Windowed rendering: pages close to the viewport get rich markdown,
                  // offscreen pages stay lightweight placeholders.
                  const isVisible =
                    mode !== "split" ||
                    totalPages <= 10 ||
                    (page.page >= textRange.first - 2 && page.page <= textRange.last + 2);

                  return (
                    <MarkdownPage
                      key={`${page.page}-${i}`}
                      page={page}
                      pageIndex={i}
                      isVisible={isVisible}
                      hoverSyncEnabled={hoverSync}
                      activeHover={activeHover}
                      onHoverBlock={handleHoverBlock}
                      onLeaveBlock={handleLeaveHover}
                    />
                  );
                })}
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
                <div
                  className="h-full min-h-0 flex-1 flex flex-col"
                  onPointerEnter={() => {
                    leader.current = "pdf";
                  }}
                >
                  <PdfPane
                    documentId={documentId}
                    targetProgress={splitting && syncScroll ? pdfScrollTarget : null}
                    targetNonce={pdfScrollTarget?.nonce}
                    onScrollProgress={handlePdfScrollProgress}
                    onUserScroll={() => {
                      leader.current = "pdf";
                    }}
                    hoverSyncEnabled={hoverSync}
                    activeHover={activeHover}
                    onHoverTarget={handleHoverPdfTarget}
                    onLeaveHover={handleLeaveHover}
                  />
                </div>
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
