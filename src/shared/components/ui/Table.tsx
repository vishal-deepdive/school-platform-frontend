import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "./Skeleton";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** right-aligns content and uses tabular figures — use for numeric columns. */
  align?: "left" | "right" | "center";
  /** Providing this makes the column sortable (client-side). */
  sortValue?: (row: T) => string | number | null | undefined;
}

interface TableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
  rowKey?: (row: T, index: number) => string | number;
  /** Renders skeleton rows in place of data while true. */
  loading?: boolean;
  loadingRows?: number;
  /**
   * Constrains the table to a max height with its own scroll area and pins
   * the header while scrolling. Use for long rosters/lists.
   */
  stickyHeader?: boolean;
}

const alignClasses = {
  left: "text-left",
  right: "text-right tabular-nums",
  center: "text-center",
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls sort last regardless of direction base
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function Table<T extends object>({
  columns,
  data,
  emptyMessage = "No data found.",
  className,
  rowKey,
  loading = false,
  loadingRows = 6,
  stickyHeader = false,
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return data;
    const sv = col.sortValue;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => factor * compareValues(sv(a), sv(b)));
  }, [data, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null; // third click clears back to the natural order
    });
  };

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-border/60 bg-background shadow-2xs",
        stickyHeader && "max-h-[70vh] overflow-y-auto scrollbar-thin",
        className,
      )}
    >
      <table className="min-w-full divide-y divide-border/60">
        <thead
          className={cn(
            "bg-muted/70 dark:bg-muted/40",
            stickyHeader && "sticky top-0 z-10 bg-muted/90 backdrop-blur",
          )}
        >
          <tr>
            {columns.map((col) => {
              const sortable = !!col.sortValue;
              const isSorted = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    isSorted
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    "px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300",
                    alignClasses[col.align ?? "left"],
                    col.className,
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "group inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
                        isSorted && "text-foreground",
                      )}
                    >
                      {col.header}
                      {isSorted ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30 bg-background">
          {loading ? (
            Array.from({ length: loadingRows }).map((_, r) => (
              <tr key={r} aria-hidden="true">
                {columns.map((col, c) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <Skeleton
                      className={cn("h-3.5", c === 0 ? "w-3/4" : "w-1/2")}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row, i) : i}
                className="hover:bg-accent/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-sm text-foreground",
                      alignClasses[col.align ?? "left"],
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
