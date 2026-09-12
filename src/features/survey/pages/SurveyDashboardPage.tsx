import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  Database,
  Download,
  FileSpreadsheet,
  Inbox,
  Layers,
  Loader2,
  Users,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { isSchoolAdmin } from "@/shared/lib/permissions";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { surveyApi, surveyKeys } from "@/features/survey/api/survey";
import { useSyncJobPolling } from "@/features/survey/hooks/useSyncJobPolling";
import type { SourceItem } from "@/features/survey/types";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiStrip, type KpiItem } from "@/shared/components/ui/KpiStrip";
import {
  ModuleHeaderActions,
  ModuleHeaderLeading,
} from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { RefreshButton } from "@/shared/components/ui/RefreshButton";
import { CardSkeleton } from "@/shared/components/ui/Skeleton";

interface RankedRow {
  label: string;
  count: number;
}

/**
 * Ranked horizontal proportion bars — reads a list of {label, count} rows as a
 * magnitude comparison rather than a flat badge list, so the biggest
 * contributors stand out at a glance. Bars are normalized to the largest row.
 */
function ResponseBars({ rows, limit = 8 }: { rows: RankedRow[]; limit?: number }) {
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
                {r.count.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{ width: `${Math.round((r.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {hidden > 0 && <p className="mt-3 text-xs text-muted-foreground">+{hidden} more not shown</p>}
    </div>
  );
}

const KPI_PLACEHOLDERS: KpiItem[] = [
  { label: "Responses", value: null, icon: <Users /> },
  { label: "Schools", value: null, icon: <BarChart2 /> },
  { label: "Classes", value: null, icon: <Layers /> },
  { label: "Active sheets", value: null, icon: <FileSpreadsheet /> },
];

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

  const activeSources = (sourcesData?.sources ?? []).filter((s: SourceItem) => s.is_active);

  const { mutate: syncAll, isPending: syncing } = useMutation({
    mutationFn: async () => {
      if (activeSources.length === 0) {
        throw new Error("No active sheets. Connect one in Sheet Connections first.");
      }
      const results = [];
      // Track failures instead of silently discarding them — a partial failure
      // (e.g. 2 of 5 sources) must not read as a plain success. A source whose
      // sync_outcome is "partial" doesn't throw (it's still a 200), so it's
      // tracked separately from a hard failure (network/validation error, 400s).
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
        throw new Error("All sheet syncs failed. Check Sheet Connections.");
      }
      const lastResult = results[results.length - 1];
      return {
        ...lastResult,
        summary: {
          ...lastResult.summary,
          records_added: results.reduce((acc, r) => acc + (r.summary?.records_added || 0), 0),
          records_skipped: results.reduce((acc, r) => acc + (r.summary?.records_skipped || 0), 0),
          records_failed: results.reduce((acc, r) => acc + (r.summary?.records_failed || 0), 0),
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

  const header = (
    <>
      {data?.timestamp && (
        <ModuleHeaderLeading>
          <span className="hidden truncate text-xs text-muted-foreground md:inline">
            Updated {formatDateTime(data.timestamp)}
          </span>
        </ModuleHeaderLeading>
      )}
      <ModuleHeaderActions>
        <RefreshButton
          onClick={() => void refetch()}
          refreshing={isFetching && !isLoading}
          label="Refresh overview"
        />
        {canSync && (
          <Button
            size="sm"
            onClick={() => syncAll()}
            loading={syncing}
            disabled={activeSources.length === 0}
            icon={<Download className="h-4 w-4" />}
          >
            Sync<span className="hidden sm:inline">&nbsp;all sheets</span>
          </Button>
        )}
      </ModuleHeaderActions>
    </>
  );

  if (isLoading) {
    return (
      <div className="space-y-6" aria-hidden="true">
        {header}
        <KpiStrip loading items={canSync ? KPI_PLACEHOLDERS : KPI_PLACEHOLDERS.slice(0, 3)} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardSkeleton lines={6} />
          <CardSkeleton lines={6} />
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="space-y-6">
        {header}
        <Alert variant="error">{getErrorMessage(statusError) || "Failed to load survey status."}</Alert>
      </div>
    );
  }

  const totalRecords = data?.total_records ?? 0;
  const embeddingFields = Object.entries(data?.embeddings ?? {});
  const hasData = totalRecords > 0;
  const bySchool = (data?.by_school ?? []).map((s) => {
    const school = s as Record<string, unknown>;
    return { label: String(school.school_name ?? "—"), count: Number(school.count ?? 0) };
  });
  const byClass = (data?.by_class ?? []).map((c) => {
    const cls = c as Record<string, unknown>;
    return {
      label: String(cls.class ?? cls.class_name ?? "").trim() || "Unknown class",
      count: Number(cls.count ?? 0),
    };
  });
  // One school's bar is just the total again — only compare when there are several.
  const showSchools = bySchool.length > 1;

  const kpis: KpiItem[] = [
    { label: "Responses", value: totalRecords.toLocaleString(), icon: <Users /> },
    { label: "Schools", value: bySchool.length, icon: <BarChart2 /> },
    { label: "Classes", value: byClass.length, icon: <Layers /> },
  ];
  if (canSync) {
    kpis.push({
      label: "Active sheets",
      value: activeSources.length,
      icon: <FileSpreadsheet />,
      hint: (
        <Link to="/survey/source" className="hover:text-foreground hover:underline">
          Manage connections
        </Link>
      ),
    });
  }

  return (
    <div className="space-y-6">
      {header}

      {embeddingsGenerating && (
        <Alert variant="info" title="Indexing new responses">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            New responses are being indexed for AI search
            {typeof syncJob?.rows_embedded === "number" &&
              ` (${syncJob.rows_embedded} indexed so far)`}
            . Ask Insights results may be incomplete until this finishes.
          </span>
        </Alert>
      )}

      <KpiStrip items={kpis} />

      {!hasData && (
        <EmptyState
          icon={<Inbox className="h-12 w-12" />}
          title="No survey responses yet"
          description={
            canSync
              ? activeSources.length > 0
                ? "Sync your connected sheets to import student feedback."
                : "Connect a Google Sheet to start importing student feedback."
              : "Student feedback will appear here once responses are imported."
          }
          action={
            canSync ? (
              activeSources.length > 0 ? (
                <Button
                  size="sm"
                  onClick={() => syncAll()}
                  loading={syncing}
                  icon={<Download className="h-4 w-4" />}
                >
                  Sync all sheets
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/survey/source">Connect a sheet</Link>
                </Button>
              )
            ) : undefined
          }
        />
      )}

      {(showSchools || byClass.length > 0) && (
        <div className={showSchools ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : undefined}>
          {showSchools && (
            <Panel flush title="Responses by school" icon={<BarChart2 className="h-4 w-4" />}>
              <ResponseBars rows={bySchool} />
            </Panel>
          )}
          {byClass.length > 0 && (
            <Panel flush title="Responses by class" icon={<Layers className="h-4 w-4" />}>
              <ResponseBars rows={byClass} limit={showSchools ? 8 : 12} />
            </Panel>
          )}
        </div>
      )}

      {embeddingFields.length > 0 && hasData && (
        <Panel
          flush
          title="AI search coverage"
          description="Responses indexed for Ask Insights"
          icon={<Database className="h-4 w-4" />}
        >
          <ul className="divide-y divide-border/50">
            {embeddingFields.map(([field, count]) => {
              const n = Number(count) || 0;
              const pct = Math.min(100, Math.round((n / Math.max(1, totalRecords)) * 100));
              return (
                <li key={field} className="px-4 py-3 md:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm capitalize text-foreground">
                      {field.replace(/_/g, " ")}
                    </p>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {n.toLocaleString()} · {pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
