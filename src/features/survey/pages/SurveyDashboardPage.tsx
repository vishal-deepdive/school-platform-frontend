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
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { surveyApi } from "@/features/survey/api/survey";
import { Card, CardHeader, StatCard } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";

// While embeddings are still being generated in the background we poll the
// sync-status endpoint. Stop once the job reports "done"/"failed", or the
// job_id is unknown (multi-worker fallback handled below).
const SYNC_POLL_MS = 3000;

export function SurveyDashboardPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  // Only admin/principal can trigger a sync (load-recent is admin-gated).
  const canSync = role === "admin" || role === "principal";
  const [syncJobId, setSyncJobId] = useState<string | null>(null);

  const { data, isLoading, isError, error: statusError, refetch, isFetching } = useQuery({
    queryKey: ["survey", "status"],
    queryFn: () => surveyApi.getStatus(),
    staleTime: 2 * 60_000,
  });

  const { mutate: syncSheets, isPending: syncing } = useMutation({
    mutationFn: () => surveyApi.loadRecent(),
    onSuccess: (res) => {
      // Rows are inserted, but embeddings are generated asynchronously. Don't
      // claim "Synced!" until embeddings exist — start polling sync-status.
      toast.success(
        `Sync started: +${res.summary.records_added} added, ${res.summary.records_skipped} skipped`,
      );
      qc.invalidateQueries({ queryKey: ["survey", "status"] });
      if (res.embedding_status !== "completed" && res.job_id) {
        setSyncJobId(res.job_id);
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // Poll embedding progress for the background job spawned by the sync.
  const { data: syncJob } = useQuery({
    queryKey: ["survey", "sync-status", syncJobId],
    queryFn: () => surveyApi.getSyncStatus(syncJobId as string),
    enabled: !!syncJobId,
    // If the poll lands on another worker (404) the job is "unknown"; stop
    // polling and let the user rely on the embedding counts below.
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

  // Resolve the polled job into a terminal state once: refresh counts on
  // success, surface the error on failure, then stop polling either way.
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

  if (isLoading) return <PageSpinner />;
  if (isError)
    return <Alert variant="error">{getErrorMessage(statusError) || "Failed to load survey status."}</Alert>;

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
              onClick={() => syncSheets()}
              loading={syncing}
              icon={<Download className="h-4 w-4" />}
            >
              Sync Google Sheets
            </Button>
          )}
        </div>
      </div>

      {embeddingsGenerating && (
        <Alert variant="info" title="Embeddings generating…">
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
          label="Embedding Columns"
          value={embeddingFields.length}
          icon={<Database className="h-5 w-5" />}
          color="indigo"
        />
      </div>

      {!hasData && (
        <EmptyState
          icon={<Inbox className="h-12 w-12" />}
          title="No survey responses yet"
          description={
            canSync
              ? "Sync Google Sheets to import student feedback and start analyzing it."
              : "Student feedback will appear here once responses are imported."
          }
          action={
            canSync ? (
              <Button
                size="sm"
                onClick={() => syncSheets()}
                loading={syncing}
                icon={<Download className="h-4 w-4" />}
              >
                Sync Google Sheets
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
            <CardHeader title="Responses by School" className="px-6 pt-6" />
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
            <CardHeader title="Responses by Class" className="px-6 pt-6" />
            <div className="divide-y divide-border pb-2">
              {data.by_class.map((c, i) => {
                const cls = c as Record<string, unknown>;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <p className="text-sm text-foreground">
                      {String(cls.class ?? cls.class_name ?? "").trim() || "Unknown Class"}
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
