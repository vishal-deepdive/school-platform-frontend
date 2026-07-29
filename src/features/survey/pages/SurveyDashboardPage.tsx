import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  RefreshCw,
  Download,
  Users,
  Database,
  Loader2,
  Inbox,
  FileSpreadsheet,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { isSchoolAdmin } from "@/shared/lib/permissions";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { surveyApi, surveyKeys } from "@/features/survey/api/survey";
import { useSyncJobPolling } from "@/features/survey/hooks/useSyncJobPolling";
import type { SourceItem } from "@/features/survey/types";
import { StatCard } from "@/shared/components/ui/Card";
import { Panel } from "@/shared/components/ui/Panel";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Skeleton, StatCardSkeleton, CardSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";

function SurveyDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <CardSkeleton lines={4} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
      </div>
    </div>
  );
}
import { EmptyState } from "@/shared/components/ui/EmptyState";

interface RankedRow {
  label: string;
  count: number;
}

/**
 * Ranked horizontal proportion bars — reads a list of {label, count} rows as a
 * magnitude comparison rather than a flat badge list, so the biggest
 * contributors stand out at a glance. Bars are normalized to the largest row.
 */
function ResponseBars({
  rows,
  accent,
  limit = 8,
}: {
  rows: RankedRow[];
  accent: string;
  limit?: number;
}) {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const shown = sorted.slice(0, limit);
  const hidden = sorted.length - shown.length;
  const max = Math.max(1, ...shown.map((r) => r.count));

  return (
    <div className="px-4 py-4 md:px-5">
      <ul className="space-y-3">
        {shown.map((r) => (
          <li key={r.label}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-foreground">{r.label}</p>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                {r.count}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.round((r.count / max) * 100)}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          +{hidden} more not shown
        </p>
      )}
    </div>
  );
}

export function SurveyDashboardPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  // Admins scope to the active school; with none selected they see the
  // cross-school aggregate. Staff are scoped to their own school server-side.
  const { schoolId, schoolParam } = useActiveSchool();
  const canSync = isSchoolAdmin(role);
  const { job: syncJob, isGenerating: embeddingsGenerating, track: trackSyncJob } =
    useSyncJobPolling();

  const {
    data,
    isLoading,
    isError,
    error: statusError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: surveyKeys.status(schoolId),
    queryFn: () => surveyApi.getStatus(schoolParam.school_name),
    staleTime: 2 * 60_000,
  });

  // Fetch sources list for the sync-all button (admin/principal only).
  const { data: sourcesData } = useQuery({
    queryKey: surveyKeys.sources(schoolId),
    queryFn: () => surveyApi.getSources(schoolParam.school_name),
    enabled: canSync,
    staleTime: 5 * 60_000,
  });

  const activeSources = (sourcesData?.sources ?? []).filter(
    (s: SourceItem) => s.is_active,
  );

  const { mutate: syncAll, isPending: syncing } = useMutation({
    mutationFn: async () => {
      if (activeSources.length === 0) {
        throw new Error(
          "No active data sources. Go to Data Source tab to connect a Google Sheet.",
        );
      }
      const results = [];
      // Track failures instead of silently discarding them — previously a
      // partial failure (e.g. 2 of 5 sources) still showed a plain success
      // toast built only from the successes, so the user never learned a
      // specific sheet stopped syncing. A source whose sync_outcome is
      // "partial" doesn't throw (it's still a 200), so it's tracked
      // separately from a hard failure (network/validation error, 400s).
      const failedLabels: string[] = [];
      const partialLabels: string[] = [];
      let lastJobId: string | null = null;
      for (const source of activeSources) {
        try {
          const result = await surveyApi.syncSource(source.id, "append");
          results.push(result);
          if (result.sync_outcome === "partial") {
            partialLabels.push(source.label || source.sheet_id || source.id);
          }
          if (result.job_id) lastJobId = result.job_id;
        } catch {
          failedLabels.push(source.label || source.sheet_id || source.id);
        }
      }
      if (results.length === 0) {
        throw new Error("All source syncs failed. Check the Data Source tab.");
      }
      const lastResult = results[results.length - 1];
      return {
        ...lastResult,
        summary: {
          ...lastResult.summary,
          records_added: results.reduce(
            (acc, r) => acc + (r.summary?.records_added || 0),
            0,
          ),
          records_skipped: results.reduce(
            (acc, r) => acc + (r.summary?.records_skipped || 0),
            0,
          ),
          records_failed: results.reduce(
            (acc, r) => acc + (r.summary?.records_failed || 0),
            0,
          ),
        },
        job_id: lastJobId,
        _syncedCount: results.length,
        _failedLabels: failedLabels,
        _partialLabels: partialLabels,
      };
    },
    onSuccess: (res) => {
      const count = (res as Record<string, unknown>)._syncedCount as number;
      const failedLabels = (res as Record<string, unknown>)._failedLabels as string[];
      const partialLabels = (res as Record<string, unknown>)._partialLabels as string[];
      const summaryMsg = `Synced ${count} source${count !== 1 ? "s" : ""}: +${res.summary.records_added} added, ${res.summary.records_skipped} skipped`;
      if (failedLabels.length > 0) {
        toast.warning(`${summaryMsg}. Failed entirely: ${failedLabels.join(", ")}`);
      } else if (partialLabels.length > 0) {
        toast.warning(
          `${summaryMsg}, ${res.summary.records_failed} row(s) failed. ` +
            `Check: ${partialLabels.join(", ")}`,
        );
      } else {
        toast.success(summaryMsg);
      }
      qc.invalidateQueries({ queryKey: surveyKeys.all });
      trackSyncJob(res.job_id);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) return <SurveyDashboardSkeleton />;
  if (isError)
    return (
      <Alert variant="error">
        {getErrorMessage(statusError) || "Failed to load survey status."}
      </Alert>
    );

  const embeddingFields = Object.entries(data?.embeddings ?? {});
  const hasData = (data?.total_records ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          Last updated {formatDateTime(data?.timestamp ?? "")}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          {canSync && (
            <Button
              size="sm"
              onClick={() => syncAll()}
              loading={syncing}
              disabled={activeSources.length === 0}
              icon={<Download className="h-4 w-4" />}
            >
              Sync All Sources
              {activeSources.length > 0 && (
                <Badge
                  variant="default"
                  className="ml-1.5 text-xs px-1.5 py-0"
                >
                  {activeSources.length}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {embeddingsGenerating && (
        <Alert variant="info" title="Embeddings generating...">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            New responses were added and are being indexed for AI search
            {typeof syncJob?.rows_embedded === "number" &&
              ` (${syncJob.rows_embedded} embedded so far)`}
            . Search results may be incomplete until this finishes.
          </span>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Responses"
          value={data?.total_records ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="primary"
        />
        <StatCard
          label="Schools"
          value={data?.by_school?.length ?? 0}
          icon={<BarChart2 className="h-5 w-5" />}
          color="info"
        />
        <StatCard
          label="Classes"
          value={data?.by_class?.length ?? 0}
          icon={<Database className="h-5 w-5" />}
          color="success"
        />
        <StatCard
          label="Active Sources"
          value={activeSources.length}
          icon={<FileSpreadsheet className="h-5 w-5" />}
          color="primary"
        />
      </div>

      {!hasData && (
        <EmptyState
          icon={<Inbox className="h-12 w-12" />}
          title="No survey responses yet"
          description={
            canSync
              ? activeSources.length > 0
                ? "Click 'Sync All Sources' to import student feedback."
                : "Go to the Data Source tab to connect a Google Sheet first."
              : "Student feedback will appear here once responses are imported."
          }
          action={
            canSync && activeSources.length > 0 ? (
              <Button
                size="sm"
                onClick={() => syncAll()}
                loading={syncing}
                icon={<Download className="h-4 w-4" />}
              >
                Sync All Sources
              </Button>
            ) : undefined
          }
        />
      )}

      {embeddingFields.length > 0 && (
        <Panel
          title="Embeddings Coverage"
          icon={<Database className="h-4 w-4" />}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {embeddingFields.map(([field, count]) => (
              <div
                key={field}
                className="rounded-lg bg-muted/40 border border-border p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  {field.replace(/_/g, " ")}
                </p>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <div className="mt-2 bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round(((count as number) / (data?.total_records ?? 1)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(
                    ((count as number) / (data?.total_records ?? 1)) * 100,
                  )}
                  % covered
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data?.by_school && data.by_school.length > 0 && (
          <Panel
            flush
            title="Responses by School"
            icon={<BarChart2 className="h-4 w-4" />}
            actions={
              <Badge variant="info">{data.by_school.length} schools</Badge>
            }
          >
            <ResponseBars
              accent="oklch(var(--primary))"
              rows={data.by_school.map((s) => {
                const school = s as Record<string, unknown>;
                return {
                  label: String(school.school_name ?? "—"),
                  count: Number(school.count ?? 0),
                };
              })}
            />
          </Panel>
        )}

        {data?.by_class && data.by_class.length > 0 && (
          <Panel
            flush
            title="Responses by Class"
            icon={<Database className="h-4 w-4" />}
            actions={
              <Badge variant="success">{data.by_class.length} classes</Badge>
            }
          >
            <ResponseBars
              accent="oklch(var(--primary))"
              rows={data.by_class.map((c) => {
                const cls = c as Record<string, unknown>;
                return {
                  label:
                    String(cls.class ?? cls.class_name ?? "").trim() ||
                    "Unknown Class",
                  count: Number(cls.count ?? 0),
                };
              })}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
