import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/features/admin/api/admin";
import { formatDate } from "@/shared/lib/utils";
import { useDebounce } from "@/shared/hooks/useDebounce";
import type { OnboardingStatus } from "@/features/admin/types";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from "@/features/admin/constants";

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "email_verified", label: "Needs Review" },
  { value: "pending_verification", label: "Pending Verification" },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            School Applications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and approve school onboarding applications
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-muted-foreground"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
            placeholder="Search by school or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-background border border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm">
          Failed to load applications. Please try again.
        </div>
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
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted/60 rounded w-2/3" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-muted rounded-full w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-12 ml-auto" />
                  </td>
                </tr>
              ))
            ) : applications?.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-muted-foreground border-dashed"
                >
                  No applications found for this filter.
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
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${APPLICATION_STATUS_COLORS[app.onboarding_status as OnboardingStatus]}`}
                    >
                      {
                        APPLICATION_STATUS_LABELS[
                          app.onboarding_status as OnboardingStatus
                        ]
                      }
                    </span>
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
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium bg-background text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={
                    applications.length < PAGE_LIMIT || isPlaceholderData
                  }
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium bg-background text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
