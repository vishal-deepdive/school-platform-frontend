import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Inbox, Clock, Hourglass, CheckCircle2, Timer } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { formatDate, getErrorMessage, cn } from "@/shared/lib/utils";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Panel } from "@/shared/components/ui/Panel";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import type { OnboardingStatus } from "@/features/admin/types";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_BADGE_VARIANTS,
} from "@/features/admin/constants";

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "email_verified", label: "Needs Review" },
  { value: "pending_verification", label: "Pending Verification" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const PAGE_LIMIT = 50;

// Aging thresholds for applications sitting in the review queue.
const AGING_WARN_DAYS = 3;
const AGING_CRITICAL_DAYS = 7;

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
          ? "bg-red-100 text-red-700"
          : days >= AGING_WARN_DAYS
            ? "bg-amber-100 text-amber-700"
            : "bg-muted text-muted-foreground",
      )}
      title={`In queue since ${appliedAt ? formatDate(appliedAt) : "—"}`}
    >
      <Hourglass className="h-3 w-3" aria-hidden />
      Waiting {days}d
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold text-foreground tabular-nums">
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function OnboardingApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("email_verified");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  // The review queue is triaged oldest-first so the longest-waiting school is
  // always at the top; history views stay newest-first.
  const sort = statusFilter === "email_verified" ? "oldest" : "newest";

  const {
    data: applications,
    isLoading,
    error,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["onboarding-applications", statusFilter, debouncedSearch, page, sort],
    queryFn: () =>
      adminApi.listApplications(
        statusFilter || undefined,
        debouncedSearch || undefined,
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

  return (
    <div className="space-y-6">
      {/* ── KPI strip ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            icon={<Inbox className="h-3.5 w-3.5" aria-hidden />}
            label="Needs review"
            value={stats.needs_review}
            hint={
              oldestWaitingDays !== null && oldestWaitingDays >= 1
                ? `Oldest waiting ${oldestWaitingDays}d`
                : undefined
            }
          />
          <StatTile
            icon={<Clock className="h-3.5 w-3.5" aria-hidden />}
            label="Waiting on applicant"
            value={stats.pending_verification + stats.changes_requested}
            hint={`${stats.pending_verification} unverified · ${stats.changes_requested} changes requested`}
          />
          <StatTile
            icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
            label="Approved this month"
            value={stats.approved_this_month}
            hint={`${stats.approved} all-time`}
          />
          <StatTile
            icon={<Timer className="h-3.5 w-3.5" aria-hidden />}
            label="Avg. time to decision"
            value={
              stats.avg_decision_days !== null
                ? `${stats.avg_decision_days}d`
                : "—"
            }
            hint="Across approved & rejected"
          />
        </div>
      )}

      <FilterBar hideHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={statusFilter === opt.value ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(opt.value)}
                className="rounded-full"
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by school or email…"
            className="w-full lg:w-72"
          />
        </div>
      </FilterBar>

      {error && (
        <Alert variant="error">
          {getErrorMessage(error) || "Failed to load applications. Please try again."}
        </Alert>
      )}

      {isLoading ? (
        <ListSkeleton items={6} />
      ) : (
        <Panel flush>
          {applications?.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Inbox className="h-10 w-10" />}
                title="No applications here"
                description={
                  searchTerm
                    ? `No results for “${searchTerm}”. Try a different search.`
                    : "Nothing matches this filter yet. New applications appear under “Needs Review” once a school verifies its email."
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {applications?.map((app) => (
                <li
                  key={app.application_id}
                  className="group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between md:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={app.school_name}
                      seed={app.application_id}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {app.school_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {app.principal_name} · {app.principal_email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground/80">
                        {app.city}, {app.state}
                        {app.applied_at
                          ? ` · Applied ${formatDate(app.applied_at)}`
                          : ""}
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
                      {APPLICATION_STATUS_LABELS[
                        app.onboarding_status as OnboardingStatus
                      ] ?? app.onboarding_status}
                    </Badge>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="opacity-80 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                    >
                      <Link to={`/admin/onboarding/${app.application_id}`}>
                        Review
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {applications && (applications.length > 0 || page > 1) && (
            <div className="flex items-center justify-between gap-4 border-t border-border/60 bg-muted/30 px-4 py-3 md:px-5 dark:bg-black/20">
              <span className="text-sm text-muted-foreground">
                Showing page {page}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={applications.length < PAGE_LIMIT || isPlaceholderData}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
