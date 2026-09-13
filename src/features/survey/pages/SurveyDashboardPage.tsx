import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  BookOpen,
  Database,
  Download,
  FileSpreadsheet,
  Inbox,
  Layers,
  Loader2,
  MessagesSquare,
  Smile,
  ThumbsUp,
  Users,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { isSchoolAdmin } from "@/shared/lib/permissions";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { surveyApi, surveyKeys } from "@/features/survey/api/survey";
import { useSyncJobPolling } from "@/features/survey/hooks/useSyncJobPolling";
import {
  CountBarChart,
  RecommendationSpread,
  SatisfactionByArea,
  SatisfactionByClass,
  SuppressedNote,
  ToughestSubjects,
  TrendDelta,
} from "@/features/survey/components/analytics";
import { TopThemesPanel } from "@/features/survey/components/TopThemesPanel";
import type { SourceItem, SurveyStatusResponse } from "@/features/survey/types";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { CollapsibleSection } from "@/shared/components/ui/CollapsibleSection";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiStrip, type KpiItem } from "@/shared/components/ui/KpiStrip";
import {
  ModuleHeaderActions,
  ModuleHeaderLeading,
} from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { RefreshButton } from "@/shared/components/ui/RefreshButton";
import { Select } from "@/shared/components/ui/Select";
import { CardSkeleton, ChartSkeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";

const KPI_PLACEHOLDERS: KpiItem[] = [
  { label: "Responses", value: null, icon: <Users /> },
  { label: "Overall satisfied", value: null, icon: <Smile /> },
  { label: "Would recommend", value: null, icon: <ThumbsUp /> },
  { label: "Avg. recommendation", value: null, icon: <ThumbsUp /> },
];

const URL_DEFAULTS = { cycle: "all" };

/**
 * Feedback Insights — what students actually said.
 *
 * This page used to report only plumbing (row counts, sheet counts, indexing
 * coverage) while the satisfaction analytics lived in a collapsed section of
 * the main dashboard. The feedback is the headline here; the pipeline health
 * moved to a fold-away section at the bottom, where it belongs.
 */
export function SurveyDashboardPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  // Admins scope to the active school; with none selected they see the
  // cross-school aggregate. Staff are scoped to their own school server-side.
  const { schoolId, schoolName, schoolParam } = useActiveSchool();
  const canSync = isSchoolAdmin(role);
  const { job: syncJob, isGenerating: embeddingsGenerating, track: trackSyncJob } =
    useSyncJobPolling();

  const [urlState, updateUrl] = useUrlState(URL_DEFAULTS);
  const cycle = urlState.cycle;

  const {
    data: analytics,
    isLoading,
    isError,
    error: analyticsError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["survey", "analytics", schoolId ?? "platform", cycle],
    queryFn: () =>
      surveyApi.getAnalytics(schoolParam.school_name, cycle === "all" ? undefined : cycle),
    staleTime: 5 * 60_000,
  });

  // Pipeline health — secondary on this page, so it never blocks the headline.
  const { data: status } = useQuery({
    queryKey: surveyKeys.status(schoolId),
    queryFn: () => surveyApi.getStatus(schoolParam.school_name),
    staleTime: 2 * 60_000,
  });

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

  // Only offer the cycle filter when there is more than one term to compare.
  const cycleOptions = useMemo(() => {
    const cycles = analytics?.cycles ?? [];
    if (cycles.length < 2) return null;
    return [
      { value: "all", label: "All cycles" },
      ...cycles
        .slice()
        .reverse()
        .map((c) => ({
          value: c.cycle,
          label: c.cycle === "default" ? "Default" : c.cycle,
        })),
    ];
  }, [analytics?.cycles]);

  const header = (
    <>
      <ModuleHeaderLeading>
        <div className="flex items-center gap-3">
          {cycleOptions && (
            <div className="w-36 sm:w-44">
              <Select
                options={cycleOptions}
                value={cycle}
                onChange={(e) => updateUrl({ cycle: e.target.value }, { push: true })}
                aria-label="Survey cycle"
              />
            </div>
          )}
          {status?.timestamp && (
            <span className="hidden truncate text-xs text-muted-foreground lg:inline">
              Updated {formatDateTime(status.timestamp)}
            </span>
          )}
        </div>
      </ModuleHeaderLeading>
      <ModuleHeaderActions>
        <RefreshButton
          onClick={() => void refetch()}
          refreshing={isFetching && !isLoading}
          label="Refresh insights"
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
      <div className="space-y-6">
        {header}
        <KpiStrip loading items={KPI_PLACEHOLDERS} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardSkeleton lines={6} />
          <CardSkeleton lines={6} />
        </div>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="space-y-6">
        {header}
        <Alert variant="error">
          {getErrorMessage(analyticsError) || "Failed to load feedback insights."}
        </Alert>
      </div>
    );
  }

  const rec = analytics.recommendation;
  const overall = analytics.overall_satisfaction;
  const overallRated = overall.positive + overall.neutral + overall.negative;
  const overallPct =
    !overall.suppressed && overallRated > 0
      ? Math.round((overall.positive / overallRated) * 100)
      : null;
  const trend = analytics.trend;

  const dimensions = analytics.dimensions.filter((d) => d.total > 0 && !d.suppressed);
  const suppressedDimensions = analytics.dimensions.filter((d) => d.suppressed);
  const dimTrendByKey = new Map((trend?.dimensions ?? []).map((d) => [d.key, d]));
  const visibleClasses = analytics.by_class.filter((c) => !c.suppressed);
  const suppressedClassCount = analytics.by_class.length - visibleClasses.length;

  const kpis: KpiItem[] = [
    {
      label: "Responses",
      value: analytics.total_responses.toLocaleString(),
      icon: <Users />,
      hint: (
        <span className="inline-flex items-center gap-1.5">
          {`from ${analytics.responded_classes} ${analytics.responded_classes === 1 ? "class" : "classes"}`}
          {trend && (
            <TrendDelta
              delta={trend.total_responses_current - trend.total_responses_previous}
              suffix=""
              title={`vs ${trend.previous_cycle}`}
            />
          )}
        </span>
      ),
    },
    {
      label: "Overall satisfied",
      value: overallPct != null ? `${overallPct}%` : "—",
      icon: <Smile />,
      tone:
        overallPct == null
          ? "primary"
          : overallPct >= 75
            ? "success"
            : overallPct >= 50
              ? "warning"
              : "danger",
      hint: (
        <span className="inline-flex items-center gap-1.5">
          rate teaching positively
          {trend &&
            trend.overall_positive_pct_current != null &&
            trend.overall_positive_pct_previous != null && (
              <TrendDelta
                delta={
                  trend.overall_positive_pct_current - trend.overall_positive_pct_previous
                }
                title={`vs ${trend.previous_cycle}`}
              />
            )}
        </span>
      ),
    },
    {
      label: "Would recommend",
      value: rec.promoters_pct != null ? `${rec.promoters_pct}%` : "—",
      icon: <ThumbsUp />,
      tone: "success",
      hint: rec.detractors_pct != null ? `${rec.detractors_pct}% would not` : undefined,
    },
    {
      label: "Avg. recommendation",
      value: rec.average != null ? rec.average.toFixed(1) : "—",
      icon: <ThumbsUp />,
      tone: "info",
      hint: (
        <span className="inline-flex items-center gap-1.5">
          out of 5
          {trend &&
            trend.recommendation_avg_current != null &&
            trend.recommendation_avg_previous != null && (
              <TrendDelta
                delta={
                  Math.round(
                    (trend.recommendation_avg_current - trend.recommendation_avg_previous) *
                      10,
                  ) / 10
                }
                suffix=""
                title={`vs ${trend.previous_cycle}`}
              />
            )}
        </span>
      ),
    },
  ];

  const hasResponses = analytics.total_responses > 0;

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

      {!hasResponses ? (
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
      ) : (
        <>
          {trend && (
            <StatLine
              items={[
                { label: `Comparing ${trend.current_cycle} to ${trend.previous_cycle}` },
                {
                  value: `${trend.total_responses_previous} → ${trend.total_responses_current}`,
                  label: "responses",
                },
              ]}
            />
          )}

          <KpiStrip items={kpis} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel
              className="lg:col-span-2"
              icon={<BarChart2 className="h-4 w-4" />}
              title="Satisfaction by area"
              description="Share of positive responses per topic"
            >
              <SatisfactionByArea dimensions={dimensions} trendByKey={dimTrendByKey} />
              <SuppressedNote
                count={suppressedDimensions.length}
                noun="area"
                names={suppressedDimensions.map((d) => d.label)}
              />
            </Panel>

            <Panel
              icon={<ThumbsUp className="h-4 w-4" />}
              title="Recommendation spread"
              description="Responses by score (1–5)"
            >
              <RecommendationSpread recommendation={rec} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel
              icon={<Layers className="h-4 w-4" />}
              title="Satisfaction by class"
              description="% rating teaching positively"
            >
              <SatisfactionByClass classes={visibleClasses} />
              <SuppressedNote count={suppressedClassCount} noun="class" />
            </Panel>

            <Panel
              icon={<BookOpen className="h-4 w-4" />}
              title="Toughest subjects"
              description="Most-cited by students"
            >
              <ToughestSubjects subjects={analytics.toughest_subjects} />
            </Panel>
          </div>

          <TopThemesPanel schoolName={schoolName} />
        </>
      )}

      <DataHealthSection
        status={status}
        activeSourceCount={canSync ? activeSources.length : null}
      />
    </div>
  );
}

/**
 * Pipeline health: how much raw data is loaded and how much of it the AI search
 * can actually see. Useful when something looks wrong, irrelevant the rest of
 * the time — hence folded away under the feedback itself.
 */
function DataHealthSection({
  status,
  activeSourceCount,
}: {
  status: SurveyStatusResponse | undefined;
  activeSourceCount: number | null;
}) {
  if (!status) return null;

  const totalRecords = status.total_records ?? 0;
  const embeddingFields = Object.entries(status.embeddings ?? {});
  const bySchool = (status.by_school ?? []).map((s) => {
    const school = s as Record<string, unknown>;
    return { label: String(school.school_name ?? "—"), count: Number(school.count ?? 0) };
  });

  return (
    <CollapsibleSection
      id="survey-data-health"
      title="Data health"
      description="Stored responses and AI-search coverage"
      defaultOpen={false}
    >
      <div className="space-y-4">
        <StatLine
          items={[
            { value: totalRecords, label: "stored responses" },
            { value: bySchool.length, label: "schools", hidden: bySchool.length < 2 },
            {
              value: activeSourceCount ?? 0,
              label: "active sheets",
              hidden: activeSourceCount === null,
            },
          ]}
        />

        {/* Only meaningful cross-school: one school's bar is the total again. */}
        {bySchool.length > 1 && (
          <Panel
            icon={<BarChart2 className="h-4 w-4" />}
            title="Responses by school"
            description="Where the stored feedback came from"
          >
            <CountBarChart rows={bySchool} unit="Responses" />
          </Panel>
        )}

        {embeddingFields.length > 0 && totalRecords > 0 && (
          <Panel
            flush
            icon={<Database className="h-4 w-4" />}
            title="AI search coverage"
            description="Responses indexed for Ask Insights"
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
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}

        {activeSourceCount !== null && (
          <p className="text-xs text-muted-foreground">
            <Link
              to="/survey/source"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <FileSpreadsheet className="h-3 w-3" />
              Manage sheet connections
            </Link>
          </p>
        )}

        {totalRecords === 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessagesSquare className="h-3.5 w-3.5" />
            Nothing stored yet.
          </p>
        )}
      </div>
    </CollapsibleSection>
  );
}
