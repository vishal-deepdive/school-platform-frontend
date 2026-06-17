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
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <Button variant="outline" size="sm" onClick={onPrev} disabled={!hasPrev}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
        Next
      </Button>
    </div>
  );
}
