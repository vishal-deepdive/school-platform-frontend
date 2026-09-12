import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Hourglass, Inbox, Timer } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { formatDate, getErrorMessage, cn } from "@/shared/lib/utils";
import { useUrlSearch, useUrlState } from "@/shared/hooks/useUrlState";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Avatar } from "@/shared/components/ui/Avatar";
import { KpiStrip } from "@/shared/components/ui/KpiStrip";
import { Pagination } from "@/shared/components/ui/Pagination";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { Tabs } from "@/shared/components/ui/Tabs";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import type { OnboardingStatus } from "@/features/admin/types";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_BADGE_VARIANTS,
} from "@/features/admin/constants";

const FILTER_TABS: { id: string; label: string }[] = [
  { id: "email_verified", label: "Needs review" },
  { id: "pending_verification", label: "Unverified" },
  { id: "changes_requested", label: "Changes requested" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const PAGE_LIMIT = 50;

// Aging thresholds for applications sitting in the review queue.
const AGING_WARN_DAYS = 3;
const AGING_CRITICAL_DAYS = 7;

const URL_DEFAULTS: { status: string; q: string; page: number } = {
  status: "email_verified",
  q: "",
  page: 1,
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.floor(ms / 86_400_000);
}

/** "Waiting Nd" chip for queue rows that are actionable by the admin —
 *  turns amber past the SLA warning threshold, red when critical. */
function AgingChip({ appliedAt }: { appliedAt: string | null }) {
  const days = daysSince(appliedAt);
  if (days === null || days < 1) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        days >= AGING_CRITICAL_DAYS
          ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
          : days >= AGING_WARN_DAYS
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            : "bg-muted text-muted-foreground",
      )}
      title={`In queue since ${appliedAt ? formatDate(appliedAt) : "—"}`}
    >
      <Hourglass className="h-3 w-3" aria-hidden />
      Waiting {days}d
    </span>
  );
}

export function OnboardingApplicationsPage() {
  const [state, update] = useUrlState(URL_DEFAULTS);
  const page = Math.max(1, state.page);
  const status = FILTER_TABS.some((t) => t.id === state.status) ? state.status : "email_verified";
  const [search, setSearch] = useUrlSearch(state.q, (q) => update({ q }), 500);

  // The review queue is triaged oldest-first so the longest-waiting school is
  // always at the top; history views stay newest-first.
  const sort = status === "email_verified" ? "oldest" : "newest";

  const {
    data: applications,
    isLoading,
    error,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["onboarding-applications", status, state.q, page, sort],
    queryFn: () =>
      adminApi.listApplications(
        status === "all" ? undefined : status,
        state.q || undefined,
        PAGE_LIMIT,
        (page - 1) * PAGE_LIMIT,
        sort,
      ),
    placeholderData: (prev) => prev,
  });

  const { data: stats } = useQuery({
    queryKey: ["onboarding-stats"],
    queryFn: adminApi.getOnboardingStats,
  });

  const oldestWaitingDays = daysSince(stats?.oldest_needs_review_at ?? null);
  const rows = applications ?? [];

  // Counts per tab come from the stats endpoint; with a search term in play
  // they no longer describe what's listed, so they're dropped.
  const tabCounts: Record<string, number | undefined> = state.q
    ? {}
    : {
        email_verified: stats?.needs_review,
        pending_verification: stats?.pending_verification,
        changes_requested: stats?.changes_requested,
        approved: stats?.approved,
        rejected: stats?.rejected,
      };
  const knownTotal = tabCounts[status];
  const totalPages = knownTotal != null ? Math.max(1, Math.ceil(knownTotal / PAGE_LIMIT)) : null;

  return (
    <div className="space-y-4">
      {stats && (
        <KpiStrip
          items={[
            {
              label: "Needs review",
              value: stats.needs_review,
              icon: <Inbox />,
              tone: stats.needs_review > 0 ? "warning" : "primary",
              hint:
                oldestWaitingDays !== null && oldestWaitingDays >= 1
                  ? `Oldest waiting ${oldestWaitingDays}d`
                  : undefined,
            },
            {
              label: "Waiting on applicant",
              value: stats.pending_verification + stats.changes_requested,
              icon: <Clock />,
              hint: `${stats.pending_verification} unverified · ${stats.changes_requested} changes requested`,
            },
            {
              label: "Approved this month",
              value: stats.approved_this_month,
              icon: <CheckCircle2 />,
              tone: "success",
              hint: `${stats.approved} all-time`,
            },
            {
              label: "Avg. time to decision",
              value: stats.avg_decision_days !== null ? `${stats.avg_decision_days}d` : "—",
              icon: <Timer />,
              hint: "Across approved & rejected",
            },
          ]}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by school or email…"
          aria-label="Search applications"
          className="w-full sm:w-72"
        />
      </div>

      {error && (
        <Alert variant="error">
          {getErrorMessage(error) || "Failed to load applications. Please try again."}
        </Alert>
      )}

      <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
        <Tabs
          size="sm"
          tabs={FILTER_TABS.map((t) => ({ ...t, count: tabCounts[t.id] }))}
          active={status}
          onChange={(id) => update({ status: id }, { push: true })}
          className="px-2 md:px-3"
        />

        {isLoading ? (
          <ListSkeleton items={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<Inbox className="h-10 w-10" />}
            title="No applications here"
            description={
              state.q
                ? `No results for “${state.q}”. Try a different search.`
                : "Nothing matches this filter yet. New applications appear under “Needs review” once a school verifies its email."
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
            {rows.map((app) => (
              <li
                key={app.application_id}
                className="group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between md:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={app.school_name} seed={app.application_id} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      {app.school_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {app.principal_name} · {app.principal_email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground/80">
                      {app.city}, {app.state}
                      {app.applied_at ? ` · Applied ${formatDate(app.applied_at)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {app.onboarding_status === "email_verified" && (
                    <AgingChip appliedAt={app.applied_at} />
                  )}
                  <Badge
                    variant={
                      APPLICATION_STATUS_BADGE_VARIANTS[
                        app.onboarding_status as OnboardingStatus
                      ] ?? "default"
                    }
                  >
                    {APPLICATION_STATUS_LABELS[app.onboarding_status as OnboardingStatus] ??
                      app.onboarding_status}
                  </Badge>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/onboarding/${app.application_id}`}>Review</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {(rows.length > 0 || page > 1) && (
          <div className="border-t border-border/60 px-4 py-3 md:px-5">
            {totalPages !== null ? (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={knownTotal ?? undefined}
                itemsLabel="applications"
                hasPrev={page > 1}
                hasNext={page < totalPages && !isPlaceholderData}
                onPrev={() => update({ page: page - 1 })}
                onNext={() => update({ page: page + 1 })}
              />
            ) : (
              // Searching: the server doesn't return a match count, so step
              // through pages without claiming a total.
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => update({ page: page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">Page {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={rows.length < PAGE_LIMIT || isPlaceholderData}
                  onClick={() => update({ page: page + 1 })}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
