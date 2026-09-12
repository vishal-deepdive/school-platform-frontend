import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Columns2, FileSearch, FileText, Layers, SearchX } from "lucide-react";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/shared/components/ui/SegmentedControl";
import { Skeleton, SkeletonText } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import { useDocumentMarkdown } from "@/features/rag/hooks/useRag";
import { DocumentChunksPreview } from "./DocumentChunksPreview";
import { useDominantPage } from "./useDominantPage";

// pdf.js is heavy and only needed once someone opens a preview with a PDF.
const PdfPane = lazy(() => import("./PdfPane").then((m) => ({ default: m.PdfPane })));

type Mode = "text" | "split" | "pdf" | "passages";

/** While we scroll one pane to follow the other, ignore that pane's scroll events. */
const FOLLOW_QUIET_MS = 450;

interface ChapterPreviewProps {
  documentId: string;
}

/**
 * Chapter preview: the parsed text and the original PDF side by side, kept in
 * step as either side scrolls. Falls back to text-only when the original file
 * is no longer stored, and offers the indexed passages for staff who need to
 * see exactly what the retriever can cite.
 */
export function ChapterPreview({ documentId }: ChapterPreviewProps) {
  const { data, isLoading, isError, error } = useDocumentMarkdown(documentId);
  const [mode, setMode] = useState<Mode>("text");
  const [syncScroll, setSyncScroll] = useState(true);

  // Which pane the reader last touched — only that one leads.
  const leader = useRef<"text" | "pdf" | null>(null);
  const quietUntil = useRef(0);
  const [pdfTarget, setPdfTarget] = useState<{ page: number; nonce: number } | null>(null);
  const [textTarget, setTextTarget] = useState<{ page: number; nonce: number } | null>(null);

  const textRef = useRef<HTMLDivElement>(null);
  const pages = data?.pages ?? [];
  const hasNumberedPages = pages.some((p) => p.page > 0);
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

  const noteScroll = useCallback((pane: "text" | "pdf") => {
    if (Date.now() < quietUntil.current) return; // our own follow-scroll
    leader.current = pane;
  }, []);

  const handleTextPage = useCallback(
    (page: number) => {
      if (!syncScroll || !splitting || leader.current !== "text" || page < 1) return;
      quietUntil.current = Date.now() + FOLLOW_QUIET_MS;
      setPdfTarget({ page, nonce: Date.now() });
    },
    [syncScroll, splitting],
  );

  const handlePdfPage = useCallback(
    (page: number) => {
      if (!syncScroll || !splitting || leader.current !== "pdf" || page < 1) return;
      quietUntil.current = Date.now() + FOLLOW_QUIET_MS;
      setTextTarget({ page, nonce: Date.now() });
    },
    [syncScroll, splitting],
  );

  const { range: textRange } = useDominantPage(textRef, pages.length, handleTextPage, mode);

  // Follow the PDF pane.
  useEffect(() => {
    if (!textTarget) return;
    const root = textRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-page="${textTarget.page}"]`);
    // scrollTo (not scrollIntoView) — the latter would also scroll the dialog.
    if (root && el) root.scrollTo({ top: Math.max(0, el.offsetTop - 12) });
  }, [textTarget]);

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

  return (
    <div className="flex h-[72vh] min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          aria-label="Preview layout"
          compact
          options={modeOptions}
          value={mode}
          onChange={pickMode}
        />
        <div className="flex flex-wrap items-center gap-3">
          {splitting && (
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-primary"
              />
              Sync scrolling
            </label>
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
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
                <p className="truncate text-xs text-muted-foreground">
                  {hasNumberedPages ? (
                    <>
                      Parsed text · page{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {textRange.first}
                      </span>{" "}
                      of <span className="tabular-nums">{pages.length}</span>
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
                onScroll={() => noteScroll("text")}
                className="relative min-h-0 flex-1 space-y-5 overflow-y-auto p-4 scrollbar-thin"
              >
                {pages.map((page, i) => (
                  <section
                    key={`${page.page}-${i}`}
                    // Page 0 is text we couldn't place — nothing to sync to.
                    data-page={page.page > 0 ? page.page : undefined}
                    className="border-t border-border/40 pt-5 first:border-t-0 first:pt-0"
                  >
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {page.page > 0 ? `Page ${page.page}` : "Unplaced text"}
                    </p>
                    <MarkdownRenderer content={page.markdown} />
                  </section>
                ))}
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
                  documentId={documentId}
                  targetPage={splitting && syncScroll ? pdfTarget?.page : undefined}
                  targetNonce={pdfTarget?.nonce}
                  onVisiblePageChange={handlePdfPage}
                  onUserScroll={() => noteScroll("pdf")}
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

/** Bordered, self-scrolling pane — the dialog body never scrolls in this view. */
function PaneShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}
