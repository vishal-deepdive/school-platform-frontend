import { cn } from "@/shared/lib/utils";

/** Shimmering placeholder block shown while content loads. Size it with className. */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/80",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.05] after:to-transparent dark:after:via-foreground/[0.04]",
        className,
      )}
    />
  );
}

/** A stack of text-line placeholders; the last line is shorter for realism. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

function SkeletonCardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card p-4 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Placeholder matching StatCard: label + icon chip, then a big number. */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonCardShell className={className}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-8 w-24" />
      <Skeleton className="mt-2 h-3 w-32" />
    </SkeletonCardShell>
  );
}

/** Generic card placeholder: heading + a few text lines. */
export function CardSkeleton({
  lines = 4,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <SkeletonCardShell className={className}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-3.5 w-56 max-w-full" />
      <SkeletonText lines={lines} className="mt-6" />
    </SkeletonCardShell>
  );
}

/** Table placeholder: header row + striped data rows inside a card. */
export function TableSkeleton({
  rows = 6,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex items-center gap-4 border-b border-border/60 bg-muted/40 px-4 py-3.5 sm:px-6">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", i === 0 ? "w-1/4" : "flex-1")} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-border/40 px-4 py-4 last:border-b-0 sm:px-6"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3.5", c === 0 ? "w-1/4" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** List placeholder: rows with an avatar/thumbnail, two text lines and an action. */
export function ListSkeleton({
  items = 4,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCardShell key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 min-w-[8rem] max-w-full" />
            <Skeleton className="h-3 w-2/3 max-w-full" />
          </div>
          <Skeleton className="hidden h-8 w-20 rounded-lg sm:block" />
        </SkeletonCardShell>
      ))}
    </div>
  );
}

/** Chart placeholder: title + rising bars. */
export function ChartSkeleton({ className }: { className?: string }) {
  const bars = [40, 65, 50, 80, 60, 90, 70, 55];
  return (
    <SkeletonCardShell className={className}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="mt-5 flex h-48 items-end gap-3 sm:h-56">
        {bars.map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </SkeletonCardShell>
  );
}

/**
 * In-table body placeholder — renders `<tr><td>` rows for use inside a real
 * `<table><tbody>`. Use `TableSkeleton` for a self-contained div-based table.
 */
export function TableBodySkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-6 py-4">
              <Skeleton
                className={cn(
                  "h-3.5",
                  c === 0
                    ? "w-3/4"
                    : c === columns - 1
                      ? "ml-auto w-12"
                      : "w-1/2",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Full-page placeholder: page header, stat grid and a content card.
 * Drop-in replacement for the old <PageSpinner /> on dashboard-style pages.
 */
export function PageSkeleton({
  showStats = true,
  content = "card",
  className,
}: {
  showStats?: boolean;
  /** Shape of the main content block below the header/stats. */
  content?: "card" | "table" | "list";
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 animate-fade-in", className)} aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {showStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}
      {content === "table" ? (
        <TableSkeleton />
      ) : content === "list" ? (
        <ListSkeleton items={5} />
      ) : (
        <CardSkeleton lines={6} />
      )}
    </div>
  );
}
