import { memo, useMemo } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { Select } from "@/shared/components/ui/Select";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn } from "@/shared/lib/utils";
import type { SelectOption } from "@/shared/types/common";
import { ALL_SUBJECTS, type LibraryState } from "@/features/rag/hooks/useLibraryState";
import type { DocumentSummaryResponse } from "@/features/rag/types";

const SCOPE_OPTIONS: SelectOption[] = [
  { value: "", label: "All sources" },
  { value: "public", label: "Public (NCERT / CBSE)" },
  { value: "private", label: "School uploads" },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "Any status" },
  { value: "completed", label: "Ready" },
  { value: "processing", label: "Processing" },
  { value: "pending", label: "Queued" },
  { value: "failed", label: "Failed" },
];

const KNOWN_BOARDS = ["CBSE", "ICSE", "State Board", "IB", "Cambridge", "Other"];

export type LibraryFilterField =
  | "scope"
  | "board"
  | "medium"
  | "status"
  | "classLevel"
  | "subject";

interface LibraryFiltersProps {
  state: LibraryState;
  search: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (field: LibraryFilterField, value: string) => void;
  onClear: () => void;
  hasFilters: boolean;
  /** Boards present in the library, merged with the common ones. */
  boards: string[];
  mediums: string[];
  /** All-chapters view only: class and subject become plain filters. */
  classOptions?: string[];
  subjectOptions?: string[];
}

export const LibraryFilters = memo(function LibraryFilters({
  state,
  search,
  onSearchChange,
  onFilterChange,
  onClear,
  hasFilters,
  boards,
  mediums,
  classOptions,
  subjectOptions,
}: LibraryFiltersProps) {
  const boardOptions = useMemo(() => {
    // Summary boards can differ only in case ("OTHER" vs "Other") — dedupe.
    const byKey = new Map<string, string>();
    [...KNOWN_BOARDS, ...boards].forEach((b) => {
      if (!byKey.has(b.toLowerCase())) byKey.set(b.toLowerCase(), b);
    });
    return [
      { value: "", label: "Any board" },
      ...Array.from(byKey.values()).map((b) => ({ value: b, label: b })),
    ];
  }, [boards]);

  const filter = (
    name: LibraryFilterField,
    label: string,
    options: SelectOption[],
    width: string,
  ) => (
    <div className={width}>
      <Select
        aria-label={label}
        options={options}
        value={name === "subject" && state.subject === ALL_SUBJECTS ? "" : state[name]}
        onChange={(e) => onFilterChange(name, e.target.value)}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search chapters or file names…"
        aria-label="Search the library"
        className="lg:w-72"
      />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {classOptions &&
          filter(
            "classLevel",
            "Class",
            [{ value: "", label: "Any class" }, ...classOptions.map((c) => ({ value: c, label: c }))],
            "sm:w-36",
          )}
        {subjectOptions &&
          filter(
            "subject",
            "Subject",
            [{ value: "", label: "Any subject" }, ...subjectOptions.map((s) => ({ value: s, label: s }))],
            "sm:w-44",
          )}
        {filter("scope", "Source", SCOPE_OPTIONS, "sm:w-48")}
        {filter("board", "Board", boardOptions, "sm:w-36")}
        {/* A single-medium school has nothing to choose between. */}
        {mediums.length > 1 &&
          filter(
            "medium",
            "Medium",
            [{ value: "", label: "Any medium" }, ...mediums.map((m) => ({ value: m, label: m }))],
            "sm:w-36",
          )}
        {filter("status", "Status", STATUS_OPTIONS, "sm:w-36")}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            icon={<X className="h-3.5 w-3.5" />}
            className="justify-self-start text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
});

function Num({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-semibold tabular-nums text-foreground", className)}>{children}</span>
  );
}

function Sep() {
  return <span aria-hidden="true" className="text-muted-foreground/50">·</span>;
}

function plural(count: number, one: string, many = `${one}s`) {
  return count === 1 ? one : many;
}

interface LibraryStatsProps {
  summary?: DocumentSummaryResponse;
  isLoading: boolean;
  /** Jump to the failed chapters (only rendered when there are some). */
  onShowFailed: () => void;
}

/** One line of library totals; the failed count is a shortcut to fix them. */
export const LibraryStats = memo(function LibraryStats({
  summary,
  isLoading,
  onShowFailed,
}: LibraryStatsProps) {
  const subjectCount = useMemo(
    () => new Set(summary?.classes.flatMap((c) => c.subjects.map((s) => s.subject))).size,
    [summary],
  );

  if (isLoading) return <Skeleton className="h-4 w-80 max-w-full" />;
  if (!summary || summary.total_documents === 0) return null;

  const total = summary.total_documents;
  const failed = summary.failed_count ?? 0;
  const completed =
    summary.completed_count ?? summary.classes.reduce((n, c) => n + c.completed_count, 0);
  const processing = Math.max(0, total - completed - failed);

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>
        <Num>{total}</Num> {plural(total, "chapter")}
      </span>
      <Sep />
      <span>
        <Num>{summary.classes.length}</Num> {plural(summary.classes.length, "class", "classes")}
      </span>
      <Sep />
      <span>
        <Num>{subjectCount}</Num> {plural(subjectCount, "subject")}
      </span>
      <Sep />
      <span>
        <Num>{summary.public_count}</Num> public
      </span>
      <Sep />
      <span>
        <Num>{summary.private_count}</Num> school {plural(summary.private_count, "upload")}
      </span>
      {processing > 0 && (
        <>
          <Sep />
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
            <Loader2 className="h-3 w-3 animate-spin" />
            <Num className="text-inherit">{processing}</Num> processing
          </span>
        </>
      )}
      {failed > 0 && (
        <>
          <Sep />
          <button
            type="button"
            onClick={onShowFailed}
            className="rounded-sm text-rose-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-rose-300"
          >
            <Num className="text-inherit">{failed}</Num> failed — review
          </button>
        </>
      )}
    </p>
  );
});
