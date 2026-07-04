import { useEffect, useState } from "react";
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
import toast from "react-hot-toast";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { surveyApi } from "@/features/survey/api/survey";
import type { SourceItem } from "@/features/survey/types";
import { Card, CardHeader, StatCard } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";

const SYNC_POLL_MS = 3000;

export function SurveyDashboardPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canSync = role === "admin" || role === "principal";
  const [syncJobId, setSyncJobId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error: statusError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["survey", "status"],
    queryFn: () => surveyApi.getStatus(),
    staleTime: 2 * 60_000,
  });

  // Fetch sources list for the sync-all button (admin/principal only).
  const { data: sourcesData } = useQuery({
    queryKey: ["survey", "sources", "self"],
    queryFn: () => surveyApi.getSources(),
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
      for (const source of activeSources) {
        try {
          results.push(await surveyApi.syncSource(source.id, "append"));
        } catch {
          // Continue with other sources even if one fails.
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
        },
        _syncedCount: results.length,
      };
    },
    onSuccess: (res) => {
      const count = (res as Record<string, unknown>)._syncedCount as number;
      toast.success(
        `Synced ${count} source${count !== 1 ? "s" : ""}: +${res.summary.records_added} added, ${res.summary.records_skipped} skipped`,
      );
      qc.invalidateQueries({ queryKey: ["survey", "status"] });
      if (res.embedding_status !== "completed" && res.job_id) {
        setSyncJobId(res.job_id);
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { data: syncJob } = useQuery({
    queryKey: ["survey", "sync-status", syncJobId],
    queryFn: () => surveyApi.getSyncStatus(syncJobId as string),
    enabled: !!syncJobId,
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "done" || status === "failed") return false;
      return SYNC_POLL_MS;
    },
  });

  const embeddingsGenerating =
    !!syncJobId &&
    !!syncJob &&
    syncJob.status !== "done" &&
    syncJob.status !== "failed";

  useEffect(() => {
    if (!syncJobId || !syncJob) return;
    if (syncJob.status === "done") {
      toast.success("Embeddings generated — search is fully up to date.");
      qc.invalidateQueries({ queryKey: ["survey", "status"] });
      setSyncJobId(null);
    } else if (syncJob.status === "failed") {
      toast.error(syncJob.error || "Embedding generation failed.");
      setSyncJobId(null);
    }
  }, [syncJob, syncJobId, qc]);

  if (isLoading) return <PageSkeleton />;
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
          color="indigo"
        />
        <StatCard
          label="Schools"
          value={data?.by_school?.length ?? 0}
          icon={<BarChart2 className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Classes"
          value={data?.by_class?.length ?? 0}
          icon={<Database className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Active Sources"
          value={activeSources.length}
          icon={<FileSpreadsheet className="h-5 w-5" />}
          color="indigo"
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
        <Card>
          <CardHeader title="Embeddings Coverage" />
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
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data?.by_school && data.by_school.length > 0 && (
          <Card padding="none">
            <CardHeader title="Responses by School" className="px-6 pt-6" bordered />
            <div className="divide-y divide-border pb-2">
              {data.by_school.map((s, i) => {
                const school = s as Record<string, unknown>;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <p className="text-sm text-foreground">
                      {String(school.school_name ?? "—")}
                    </p>
                    <Badge variant="info">
                      {String(school.count ?? 0)} responses
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {data?.by_class && data.by_class.length > 0 && (
          <Card padding="none">
            <CardHeader title="Responses by Class" className="px-6 pt-6" bordered />
            <div className="divide-y divide-border pb-2">
              {data.by_class.map((c, i) => {
                const cls = c as Record<string, unknown>;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <p className="text-sm text-foreground">
                      {String(
                        cls.class ?? cls.class_name ?? "",
                      ).trim() || "Unknown Class"}
                    </p>
                    <Badge variant="success">
                      {String(cls.count ?? 0)} responses
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
