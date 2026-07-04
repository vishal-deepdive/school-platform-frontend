import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { formatDate, getErrorMessage } from "@/shared/lib/utils";
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

export function OnboardingApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("email_verified");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  const {
    data: applications,
    isLoading,
    error,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["onboarding-applications", statusFilter, debouncedSearch, page],
    queryFn: () =>
      adminApi.listApplications(
        statusFilter || undefined,
        debouncedSearch || undefined,
        PAGE_LIMIT,
        (page - 1) * PAGE_LIMIT,
      ),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-6">
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
