import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Inbox } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { formatDate, getErrorMessage } from "@/shared/lib/utils";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import type { OnboardingStatus } from "@/features/admin/types";
import { Badge } from "@/shared/components/ui/Badge";
import { TableBodySkeleton } from "@/shared/components/ui/Skeleton";
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
      <div className="flex justify-end">
        <div className="w-full sm:w-72">
          <Input
            type="text"
            leftIcon={<Search className="h-4 w-4 text-muted-foreground" />}
            placeholder="Search by school or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
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

      {error && (
        <Alert variant="error">
          {getErrorMessage(error) || "Failed to load applications. Please try again."}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {[
                "School",
                "Principal",
                "Location",
                "Status",
                "Applied At",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {isLoading ? (
              <TableBodySkeleton rows={5} columns={6} />
            ) : applications?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10">
                  <EmptyState
                    className="border-0 py-6"
                    icon={<Inbox className="h-10 w-10" />}
                    title="No applications here"
                    description={
                      searchTerm
                        ? `No results for “${searchTerm}”. Try a different search.`
                        : "Nothing matches this filter yet. New applications appear under “Needs Review” once a school verifies its email."
                    }
                  />
                </td>
              </tr>
            ) : (
              applications?.map((app) => (
                <tr
                  key={app.application_id}
                  className="hover:bg-muted/50 transition-all duration-200 group"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {app.school_name}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-foreground">
                      {app.principal_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {app.principal_email}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {app.city}, {app.state}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={APPLICATION_STATUS_BADGE_VARIANTS[app.onboarding_status as OnboardingStatus] ?? "default"}
                    >
                      {APPLICATION_STATUS_LABELS[app.onboarding_status as OnboardingStatus] ?? app.onboarding_status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {app.applied_at ? formatDate(app.applied_at) : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/admin/onboarding/${app.application_id}`}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors opacity-80 group-hover:opacity-100"
                    >
                      Review &rarr;
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!isLoading &&
          applications &&
          (applications.length > 0 || page > 1) && (
            <div className="px-6 py-4 border-t border-border bg-muted/50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing page {page}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={applications.length < PAGE_LIMIT || isPlaceholderData}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
