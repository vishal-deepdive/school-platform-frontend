/**
 * Platform-admin Audit Log viewer — the central security trail (logins,
 * approvals, admin actions, data deletions) captured by app/core/audit.py.
 * Filter by action, actor, school, and date range; newest first, paginated.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ScrollText } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { getErrorMessage } from "@/shared/lib/utils";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useUrlSearch, useUrlState } from "@/shared/hooks/useUrlState";
import type { AuditLogEntry } from "@/features/admin/types";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Panel } from "@/shared/components/ui/Panel";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { FilterToolbar } from "@/shared/components/ui/FilterToolbar";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { StatLine } from "@/shared/components/ui/StatLine";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Pagination } from "@/shared/components/ui/Pagination";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { DatePicker } from "@/shared/components/ui/DatePicker";

const PAGE_SIZE = 30;

// Colour the action badge by its module prefix (e.g. "admin.user.deactivated").
const PREFIX_BADGE: Record<string, BadgeVariant> = {
  auth: "info",
  admin: "indigo",
  onboarding: "purple",
  attendance: "success",
  rag: "primary",
  survey: "warning",
};

function actionVariant(action: string): BadgeVariant {
  return PREFIX_BADGE[action.split(".")[0]] ?? "default";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

const URL_DEFAULTS: {
  action: string;
  actor: string;
  school: string;
  schoolName: string;
  from: string;
  to: string;
  page: number;
} = { action: "", actor: "", school: "", schoolName: "", from: "", to: "", page: 1 };

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasMeta = entry.metadata && Object.keys(entry.metadata).length > 0;
  const actor = entry.actor_name || entry.actor_email || entry.actor_id || "system";

  return (
    <li className="px-4 py-3 md:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={actionVariant(entry.action)}>
              <span className="font-mono">{entry.action}</span>
            </Badge>
            {entry.school_name && (
              <span className="text-xs text-muted-foreground">{entry.school_name}</span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-foreground">
            <span className="font-medium">{actor}</span>
            {entry.actor_email && entry.actor_name ? (
              <span className="text-muted-foreground"> · {entry.actor_email}</span>
            ) : null}
          </p>
          {entry.target_type && (
            <p className="truncate text-xs text-muted-foreground">
              Target: {entry.target_type}
              {entry.target_id ? ` · ${entry.target_id}` : ""}
            </p>
          )}
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
          {(hasMeta || entry.ip) && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="mt-1 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Details
              <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          {hasMeta && (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
            {entry.ip && <span>IP: {entry.ip}</span>}
            {entry.request_id && <span>Request: {entry.request_id}</span>}
          </div>
        </div>
      )}
    </li>
  );
}

export function AuditLogPage() {
  const [state, update] = useUrlState(URL_DEFAULTS);
  const page = Math.max(1, state.page);
  const [actor, setActor] = useUrlSearch(state.actor, (v) => update({ actor: v }), 400);

  const { setQuery: setSchoolQuery, options: schoolOptions, isSearching } = useSchoolSearch();

  const { data: actions } = useQuery({
    queryKey: ["admin", "audit-actions"],
    queryFn: () => adminApi.listAuditActions(),
    staleTime: 30 * 60_000,
  });

  const offset = (page - 1) * PAGE_SIZE;
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: [
      "admin",
      "audit-log",
      {
        action: state.action,
        actor: state.actor,
        schoolId: state.school,
        dateFrom: state.from,
        dateTo: state.to,
        offset,
      },
    ],
    queryFn: () =>
      adminApi.listAuditLog({
        action: state.action || undefined,
        actor: state.actor || undefined,
        school_id: state.school || undefined,
        date_from: state.from || undefined,
        date_to: state.to || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
    placeholderData: (prev) => prev,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const entries = data?.items ?? [];

  const actionOptions = [
    { value: "", label: "All actions" },
    ...(actions ?? []).map((a) => ({ value: a, label: a })),
  ];

  const schoolFilterOptions = useMemo(() => {
    const base = [{ label: "All schools", value: "" }, ...schoolOptions];
    if (state.school && state.schoolName && !base.some((o) => o.value === state.school)) {
      base.push({ label: state.schoolName, value: state.school });
    }
    return base;
  }, [schoolOptions, state.school, state.schoolName]);

  const hasFilters = Boolean(
    state.action || state.actor || state.school || state.from || state.to,
  );
  const clearFilters = () => {
    setActor("");
    update({ action: "", actor: "", school: "", schoolName: "", from: "", to: "" });
  };

  return (
    <div className="space-y-4">
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
            loading={isLoading}
            items={[{ value: total, label: total === 1 ? "event" : "events" }]}
          />
        }
      >
        <SearchInput
          value={actor}
          onChange={setActor}
          placeholder="Actor name or email…"
          aria-label="Filter by actor"
          className="w-full sm:w-56"
        />
        <div className="w-full sm:w-56">
          <Select
            options={actionOptions}
            value={state.action}
            onChange={(e) => update({ action: e.target.value })}
            aria-label="Filter by action"
          />
        </div>
        <div className="w-full sm:w-56">
          <SearchableSelect
            options={schoolFilterOptions}
            value={state.school}
            onChange={(value) => {
              const option = schoolOptions.find((o) => o.value === value);
              update({ school: value, schoolName: option?.label ?? "" });
            }}
            onSearchChange={setSchoolQuery}
            isLoading={isSearching}
            placeholder="All schools"
            searchPlaceholder="Search schools…"
          />
        </div>
      </FilterToolbar>

      {error && (
        <Alert variant="error">{getErrorMessage(error) || "Failed to load the audit log."}</Alert>
      )}

      {isLoading ? (
        <ListSkeleton items={8} />
      ) : (
        <Panel flush>
          {entries.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={<ScrollText className="h-10 w-10" />}
              title="No events match"
              description="Adjust the filters or widen the date range."
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
              className={
                isPlaceholderData
                  ? "divide-y divide-border/50 opacity-60 transition-opacity"
                  : "divide-y divide-border/50 transition-opacity"
              }
              aria-busy={isPlaceholderData}
            >
              {entries.map((e) => (
                <AuditRow key={e.id} entry={e} />
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="border-t border-border/60 px-4 py-3 md:px-5">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsLabel="events"
                hasPrev={page > 1}
                hasNext={page < totalPages && !isPlaceholderData}
                onPrev={() => update({ page: page - 1 })}
                onNext={() => update({ page: page + 1 })}
              />
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
