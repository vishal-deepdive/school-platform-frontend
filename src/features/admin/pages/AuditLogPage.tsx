/**
 * Platform-admin Audit Log viewer — the central security trail (logins,
 * approvals, admin actions, data deletions) captured by app/core/audit.py.
 * Filter by action, actor, school, and date range; newest first, paginated.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronDown } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { getErrorMessage } from "@/shared/lib/utils";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import type { AuditLogEntry } from "@/features/admin/types";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { Panel } from "@/shared/components/ui/Panel";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { SearchInput } from "@/shared/components/ui/SearchInput";
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
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Details
              <ChevronDown
                className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
              />
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
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const debouncedActor = useDebounce(actor, 400);
  const {
    setQuery: setSchoolQuery,
    options: schoolOptions,
    isSearching,
  } = useSchoolSearch();

  const { data: actions } = useQuery({
    queryKey: ["admin", "audit-actions"],
    queryFn: () => adminApi.listAuditActions(),
    staleTime: 30 * 60_000,
  });

  useEffect(() => {
    setPage(1);
  }, [action, debouncedActor, schoolId, dateFrom, dateTo]);

  const offset = (page - 1) * PAGE_SIZE;
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: [
      "admin",
      "audit-log",
      { action, debouncedActor, schoolId, dateFrom, dateTo, offset },
    ],
    queryFn: () =>
      adminApi.listAuditLog({
        action: action || undefined,
        actor: debouncedActor || undefined,
        school_id: schoolId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
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

  const schoolFilterOptions = [{ label: "All schools", value: "" }, ...schoolOptions];

  return (
    <div className="space-y-6">
      <FilterBar hideHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            options={actionOptions}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="Filter by action"
          />
          <SearchInput
            value={actor}
            onChange={setActor}
            placeholder="Actor name or email…"
          />
          <SearchableSelect
            options={schoolFilterOptions}
            value={schoolId}
            onChange={setSchoolId}
            onSearchChange={setSchoolQuery}
            isLoading={isSearching}
            placeholder="All schools"
            searchPlaceholder="Search schools…"
          />
          <DatePicker
            label="From"
            value={dateFrom}
            onChange={(iso) => setDateFrom(iso ?? "")}
          />
          <DatePicker
            label="To"
            value={dateTo}
            onChange={(iso) => setDateTo(iso ?? "")}
          />
        </div>
      </FilterBar>

      {error && (
        <Alert variant="error">{getErrorMessage(error) || "Failed to load the audit log."}</Alert>
      )}

      {isLoading ? (
        <ListSkeleton items={8} />
      ) : (
        <Panel
          flush
          icon={<ScrollText className="h-4 w-4" />}
          title="Audit log"
          actions={<Badge variant="primary">{total} events</Badge>}
        >
          {entries.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<ScrollText className="h-10 w-10" />}
                title="No events match"
                description="Adjust the filters or widen the date range."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
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
                hasPrev={page > 1}
                hasNext={page < totalPages && !isPlaceholderData}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => p + 1)}
              />
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
