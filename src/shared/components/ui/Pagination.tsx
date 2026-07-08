import { cn } from "@/shared/lib/utils";
import { Button } from "./Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  className?: string;
  /** Total record count — shown as "142 students · Page 2 of 9". */
  totalItems?: number;
  /** Plural noun for totalItems, e.g. "students", "documents". */
  itemsLabel?: string;
}

/**
 * Previous / Page X of Y / Next footer, driven by usePagination's return values.
 */
export function Pagination({
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  className,
  totalItems,
  itemsLabel = "items",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <Button variant="outline" size="sm" onClick={onPrev} disabled={!hasPrev}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        {totalItems != null && (
          <>
            {totalItems} {itemsLabel} ·{" "}
          </>
        )}
        Page {currentPage} of {totalPages}
      </span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
        Next
      </Button>
    </div>
  );
}
