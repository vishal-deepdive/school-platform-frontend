import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, History } from "lucide-react";
import toast from "@/shared/lib/toast";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { useUrlSearch, useUrlState } from "@/shared/hooks/useUrlState";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { FilterToolbar } from "@/shared/components/ui/FilterToolbar";
import { Input } from "@/shared/components/ui/Input";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Pagination } from "@/shared/components/ui/Pagination";
import { Panel } from "@/shared/components/ui/Panel";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { Select } from "@/shared/components/ui/Select";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { cn, downloadBlob, formatDateTime, getErrorMessage } from "@/shared/lib/utils";

// Mirrors the backend's JSON-path cap (attendance/repository.py
// _CHANGE_LOG_JSON_LIMIT) — this view is bounded; Export CSV streams the
// full, unbounded history straight from the server.
const CHANGE_LOG_JSON_LIMIT = 1000;
const PAGE_SIZE = 50;

const CHANGE_TYPE_VARIANTS: Record<string, BadgeVariant> = {
  delete: "danger",
  insert: "success",
  face_enroll: "success",
  face_attach: "success",
  embedding_update: "info",
  manual_mark: "primary",
  attendance_correction: "warning",
  leave_excused: "purple",
  holiday_add: "indigo",
  holiday_delete: "default",
};

const humanize = (value: string) =>
  value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const TYPE_OPTIONS = [
  { value: "", label: "Any change" },
  ...Object.keys(CHANGE_TYPE_VARIANTS).map((t) => ({ value: t, label: humanize(t) })),
];

const URL_DEFAULTS: {
  class: string;
  section: string;
  roll: string;
  type: string;
  from: string;
  to: string;
  page: number;
} = { class: "", section: "", roll: "", type: "", from: "", to: "", page: 1 };

export function ChangeLogPage() {
  const { schoolId, schoolName, isAdmin, schoolParam } = useActiveSchool();
  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);

  const [state, update] = useUrlState(URL_DEFAULTS);
  const page = Math.max(1, state.page);
  const [roll, setRoll] = useUrlSearch(state.roll, (v) => update({ roll: v }));
  const [classText, setClassText] = useUrlSearch(state.class, (v) =>
    update({ class: v, section: "" }),
  );
  const [sectionText, setSectionText] = useUrlSearch(state.section, (v) => update({ section: v }));

  const sectionOptions = state.class ? getSectionOptions(state.class) : [];
  const hasClassConfig = classNameOptions.length > 0;
  const canSearch = !isAdmin || !!schoolName;

  const params: Record<string, string> = {
    ...schoolParam,
    ...(state.class ? { class_name: state.class } : {}),
    ...(state.section ? { section: state.section } : {}),
    ...(state.roll ? { roll_no: state.roll } : {}),
    ...(state.type ? { change_type: state.type } : {}),
    ...(state.from ? { start_date: state.from } : {}),
    ...(state.to ? { end_date: state.to } : {}),
  };

  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ["attendance", "change-log", params],
    queryFn: () => attendanceApi.getChangeLog(params),
    enabled: canSearch,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const entries = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pageEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // A narrower filter can leave the current page beyond the end of the results.
  useEffect(() => {
    if (page > totalPages) update({ page: totalPages });
  }, [page, totalPages, update]);

  const exportCsv = useMutation({
    mutationFn: () => attendanceApi.exportChangeLog(params),
    onSuccess: (blob) =>
      downloadBlob(blob, `change-log-${new Date().toISOString().slice(0, 10)}.csv`),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const hasFilters = Boolean(
    state.class || state.section || state.roll || state.type || state.from || state.to,
  );
  const clearFilters = () => {
    setRoll("");
    setClassText("");
    setSectionText("");
    update({ class: "", section: "", roll: "", type: "", from: "", to: "" });
  };

  return (
    <div className="space-y-4">
      <ModuleHeaderActions>
        <Button
          size="sm"
          variant="outline"
          icon={<Download className="h-4 w-4" />}
          loading={exportCsv.isPending}
          disabled={!canSearch}
          onClick={() => exportCsv.mutate()}
        >
          Export CSV
        </Button>
      </ModuleHeaderActions>

      <FilterToolbar
        hasFilters={hasFilters}
        onClear={clearFilters}
        moreCount={(state.from ? 1 : 0) + (state.to ? 1 : 0)}
        more={
          <>
            <DatePicker
              label="From"
              value={state.from || undefined}
              onChange={(iso) => update({ from: iso ?? "" })}
            />
            <DatePicker
              label="To"
              value={state.to || undefined}
              onChange={(iso) => update({ to: iso ?? "" })}
            />
          </>
        }
        end={
          <StatLine
            loading={isLoading && canSearch}
            items={[
              {
                value: entries.length,
                label: entries.length === 1 ? "change" : "changes",
              },
              {
                label: "capped — narrow the filters or export the full CSV",
                tone: "warning",
                hidden: entries.length < CHANGE_LOG_JSON_LIMIT,
              },
            ]}
          />
        }
      >
        <SearchInput
          value={roll}
          onChange={setRoll}
          placeholder="Roll number…"
          aria-label="Filter by roll number"
          className="w-full sm:w-44"
        />
        <div className="w-[calc(50%-0.25rem)] sm:w-36">
          {hasClassConfig ? (
            <Select
              aria-label="Class"
              options={[{ value: "", label: "All classes" }, ...classNameOptions]}
              value={state.class}
              onChange={(e) => update({ class: e.target.value, section: "" })}
            />
          ) : (
            <Input
              aria-label="Class"
              placeholder="Class"
              value={classText}
              onChange={(e) => setClassText(e.target.value)}
            />
          )}
        </div>
        <div className="w-[calc(50%-0.25rem)] sm:w-32">
          {hasClassConfig ? (
            <Select
              aria-label="Section"
              options={[{ value: "", label: "All sections" }, ...sectionOptions]}
              value={state.section}
              disabled={!state.class}
              onChange={(e) => update({ section: e.target.value })}
            />
          ) : (
            <Input
              aria-label="Section"
              placeholder="Section"
              value={sectionText}
              onChange={(e) => setSectionText(e.target.value)}
            />
          )}
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Change type"
            options={TYPE_OPTIONS}
            value={state.type}
            onChange={(e) => update({ type: e.target.value })}
          />
        </div>
      </FilterToolbar>

      {!canSearch ? (
        <EmptyState
          icon={<History className="h-10 w-10" />}
          title="Pick a school first"
          description="Select the school you're working on from the dashboard to see its change log."
        />
      ) : isError ? (
        <Alert variant="error">{getErrorMessage(error) || "Failed to load the change log."}</Alert>
      ) : (
        <Panel flush>
          {isLoading ? (
            <ListSkeleton items={6} />
          ) : entries.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={<History className="h-9 w-9" />}
              title="No changes found"
              description={
                hasFilters
                  ? "Nothing matches these filters — try widening the date range."
                  : "Enrollments, corrections and deletions will appear here."
              }
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul
              className={cn(
                "divide-y divide-border/50 transition-opacity",
                isPlaceholderData && "opacity-60",
              )}
              aria-busy={isPlaceholderData}
            >
              {pageEntries.map((e, i) => (
                <li
                  key={`${e.timestamp}-${e.roll_no}-${i}`}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={CHANGE_TYPE_VARIANTS[e.change_type] ?? "default"}>
                        {humanize(e.change_type)}
                      </Badge>
                      <span className="truncate text-sm font-medium text-foreground">
                        Roll #{e.roll_no || "—"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[e.class_name, e.section, e.subject].filter(Boolean).join(" · ") || "—"}
                      {e.session ? ` · ${e.session}` : ""}
                    </p>
                    {e.details && (
                      <p className="truncate text-xs text-muted-foreground/80">{e.details}</p>
                    )}
                  </div>
                  <time className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(e.timestamp)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={entries.length}
        itemsLabel="changes"
        hasNext={page < totalPages}
        hasPrev={page > 1}
        onNext={() => update({ page: page + 1 })}
        onPrev={() => update({ page: page - 1 })}
      />
    </div>
  );
}
