import { memo } from "react";
import { Eye, FileText, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { TableBodySkeleton } from "@/shared/components/ui/Skeleton";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { cn, formatFileSize } from "@/shared/lib/utils";
import { resolveDocumentStatus } from "@/features/rag/lib/documentStatus";
import type { DocumentItem, DocumentStatusResponse } from "@/features/rag/types";
import { DocumentScope, DocumentStatusCell } from "./DocumentStatusCell";

export type RowAction = "delete" | "retry";

interface ChapterTableProps {
  items: DocumentItem[];
  live: Record<string, DocumentStatusResponse>;
  isLoading: boolean;
  /** Dim rows while a new result set loads over the previous one. */
  isStale?: boolean;
  canManage: boolean;
  /** Show the Class · Subject column (flat lists and search results). */
  showLocation: boolean;
  pending: { id: string; action: RowAction } | null;
  onPreview: (doc: DocumentItem) => void;
  onRetry: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
}

const TH =
  "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

export function ChapterTable({
  items,
  live,
  isLoading,
  isStale = false,
  canManage,
  showLocation,
  pending,
  onPreview,
  onRetry,
  onDelete,
}: ChapterTableProps) {
  const columns = 4 + (showLocation ? 1 : 0) + (canManage ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          "min-w-full divide-y divide-border/50 transition-opacity",
          isStale && "opacity-60",
        )}
        aria-busy={isLoading || isStale || undefined}
      >
        <thead className="bg-muted/40">
          <tr>
            <th scope="col" className={TH}>Chapter</th>
            {showLocation && (
              <th scope="col" className={cn(TH, "hidden sm:table-cell")}>Class · Subject</th>
            )}
            <th scope="col" className={cn(TH, "hidden md:table-cell")}>Edition</th>
            <th scope="col" className={cn(TH, "hidden lg:table-cell")}>Availability</th>
            <th scope="col" className={TH}>Status</th>
            {canManage && (
              <th scope="col" className={TH}>
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 bg-card">
          {isLoading ? (
            <TableBodySkeleton rows={6} columns={columns} />
          ) : (
            items.map((doc) => (
              <ChapterRow
                key={doc.id}
                doc={doc}
                live={live[doc.id]}
                canManage={canManage}
                showLocation={showLocation}
                pendingAction={pending?.id === doc.id ? pending.action : undefined}
                onPreview={onPreview}
                onRetry={onRetry}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface ChapterRowProps {
  doc: DocumentItem;
  live?: DocumentStatusResponse;
  canManage: boolean;
  showLocation: boolean;
  pendingAction?: RowAction;
  onPreview: (doc: DocumentItem) => void;
  onRetry: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
}

// Memoized: live polling updates re-render only the rows whose sample changed.
const ChapterRow = memo(function ChapterRow({
  doc,
  live,
  canManage,
  showLocation,
  pendingAction,
  onPreview,
  onRetry,
  onDelete,
}: ChapterRowProps) {
  const status = resolveDocumentStatus(doc, live);
  const canPreview = canManage && status.status === "completed";
  const edition = [doc.board, doc.medium].filter(Boolean).join(" · ");

  return (
    <tr className="group transition-colors hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 inline-flex h-7 min-w-[2rem] shrink-0 items-center justify-center rounded-md bg-primary/10 px-1.5 text-xs font-semibold tabular-nums text-primary"
            title={`Chapter ${doc.chapter_number}`}
          >
            {doc.chapter_number}
          </span>
          <div className="min-w-0">
            {canPreview ? (
              <button
                type="button"
                onClick={() => onPreview(doc)}
                className="line-clamp-2 rounded-sm text-left text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {doc.chapter_name}
              </button>
            ) : (
              <p className="line-clamp-2 text-sm font-medium text-foreground">{doc.chapter_name}</p>
            )}
            <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="max-w-[16rem] truncate" title={doc.original_filename}>
                {doc.original_filename}
              </span>
              <span className="shrink-0">· {formatFileSize(doc.file_size)}</span>
            </p>
            {/* Columns hidden on narrow screens fold in here. */}
            <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-muted-foreground md:hidden">
              {showLocation && (
                <span className="sm:hidden">
                  {doc.class_level} · {doc.subject}
                </span>
              )}
              {edition && <span>{edition}</span>}
            </p>
          </div>
        </div>
      </td>
      {showLocation && (
        <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">
          <p className="text-sm text-foreground">{doc.class_level}</p>
          <p className="text-xs text-muted-foreground">{doc.subject}</p>
        </td>
      )}
      <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
        <p className="text-sm text-foreground">{doc.board || "—"}</p>
        <p className="text-xs text-muted-foreground">{doc.medium}</p>
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        <DocumentScope isGlobal={doc.is_global} schoolName={doc.school_name} />
      </td>
      <td className="px-4 py-3">
        <DocumentStatusCell status={status} />
      </td>
      {canManage && (
        <td className="whitespace-nowrap px-3 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {status.status === "failed" && (
              <Button
                variant="outline"
                size="sm"
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                loading={pendingAction === "retry"}
                onClick={() => onRetry(doc)}
              >
                Retry
              </Button>
            )}
            {/* Secondary actions surface on row hover/focus (pointer devices only). */}
            <div
              className={cn(
                "flex items-center gap-1 transition-opacity",
                !pendingAction &&
                  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100",
              )}
            >
              {canPreview && (
                <Tooltip content="Preview passages" side="top">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPreview(doc)}
                    aria-label={`Preview ${doc.chapter_name}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </Tooltip>
              )}
              <Tooltip content="Delete chapter" side="top">
                <Button
                  variant="danger-ghost"
                  size="icon"
                  className="h-8 w-8"
                  loading={pendingAction === "delete"}
                  onClick={() => onDelete(doc)}
                  aria-label={`Delete ${doc.chapter_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>
        </td>
      )}
    </tr>
  );
});
