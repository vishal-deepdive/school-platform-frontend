import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  MessagesSquare,
  Minus,
  Quote,
  RefreshCw,
  Smile,
  Sparkles,
  ThumbsUp,
  Users,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { surveyApi } from "@/features/survey/api/survey";
import { Card, StatCard } from "@/shared/components/ui/Card";
import { CollapsibleSection } from "@/shared/components/ui/CollapsibleSection";
import { ChartSkeleton, StatCardSkeleton } from "@/shared/components/ui/Skeleton";
import { Select } from "@/shared/components/ui/Select";
import { Badge } from "@/shared/components/ui/Badge";
import { Tooltip as UiTooltip } from "@/shared/components/ui/Tooltip";
import { BarList } from "@/features/dashboard/components/BarList";
import { useSchoolScopedQuery } from "@/shared/hooks/useSchoolScopedQuery";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { SelectSchoolPrompt } from "@/features/dashboard/components/SelectSchoolPrompt";
import type { SurveyThemeSentiment } from "@/features/survey/types";

/** Traffic-light color for a "% positive" satisfaction value. */
function pctColor(pct: number): string {
  if (pct >= 75) return "#10b981"; // emerald-500
  if (pct >= 50) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

const SCORE_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981"]; // 1→5

interface RecTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { score: number; count: number } }>;
}

function RecTooltip({ active, payload }: RecTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">Score {p.score} / 5</p>
      <p className="mt-1 text-muted-foreground">
        {p.count} {p.count === 1 ? "response" : "responses"}
      </p>
    </div>
  );
}

/** Compact "+4pts vs last term" / "flat" / "-3pts" indicator for a cycle-over-cycle delta. */
function TrendDelta({
  delta,
  suffix = "pts",
  title,
}: {
  delta: number | null | undefined;
  suffix?: string;
  title?: string;
}) {
  if (delta === null || delta === undefined) return null;
  if (delta === 0) {
    return (
      <span
        title={title}
        className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground"
      >
        <Minus className="h-3 w-3" /> flat
      </span>
    );
  }
  const positive = delta > 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
      )}
    >
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {delta}
      {suffix}
    </span>
  );
}

const SENTIMENT_BADGE: Record<SurveyThemeSentiment, { variant: "success" | "danger" | "warning"; label: string }> = {
  positive: { variant: "success", label: "Positive" },
  negative: { variant: "danger", label: "Negative" },
  mixed: { variant: "warning", label: "Mixed" },
};

/**
 * Recurring feedback themes clustered from open-text embeddings (GET /survey/themes)
 * — turns raw open-ended feedback into scannable, labeled patterns without the
 * viewer having to know what to ask the AI copilot.
 */
function TopThemesPanel({ schoolName }: { schoolName: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useSchoolScopedQuery({
    key: ["survey", "themes"],
    queryFn: () => surveyApi.getThemes({ schoolName: schoolName || undefined }),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const { mutate: refresh, isPending: refreshing } = useMutation({
    mutationFn: () => surveyApi.getThemes({ schoolName: schoolName || undefined, refresh: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["survey", "themes"] }),
  });

  if (isLoading) {
    return (
      <Card padding="md">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Top feedback themes</h4>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data || data.insufficient_data || data.themes.length === 0) {
    return (
      <Card padding="md">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Top feedback themes</h4>
        </div>
        <p className="py-4 text-center text-xs text-muted-foreground">
          Not enough open-text feedback yet to surface recurring themes.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">Top feedback themes</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Clustered from {data.sample_size} open-text responses
            </p>
          </div>
        </div>
        <UiTooltip content="Recompute themes now">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={refreshing || isFetching}
            aria-label="Refresh themes"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </UiTooltip>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.themes.map((theme, i) => {
          const sentiment = SENTIMENT_BADGE[theme.sentiment] ?? SENTIMENT_BADGE.mixed;
          return (
            <div
              key={`${theme.label}-${i}`}
              className="rounded-lg border border-border/60 bg-muted/20 p-3.5"
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {theme.label}
                </p>
                <Badge variant={sentiment.variant} className="shrink-0">
                  {sentiment.label}
                </Badge>
              </div>
              <p className="mb-2 text-xs text-muted-foreground leading-relaxed">{theme.summary}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {theme.count} {theme.count === 1 ? "mention" : "mentions"}
                </span>
              </div>
              {theme.sample_quotes.length > 0 && (
                <div className="mt-2 border-t border-border/50 pt-2">
                  <p className="flex items-start gap-1.5 text-xs italic text-muted-foreground/90 leading-relaxed">
                    <Quote className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                    <span className="line-clamp-2">{theme.sample_quotes[0]}</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * Student-feedback satisfaction analytics, rendered from GET /survey/analytics.
 * Surfaces response volume, the recommendation score, per-area satisfaction,
 * per-class sentiment, cycle-over-cycle trend, and recurring feedback themes.
 * Staff-only (admin/principal/teacher); self-hides on an access error.
 */
export function SurveyAnalyticsSection() {
  const [cycle, setCycle] = useState<string>("all");
  const { schoolName } = useActiveSchool();

  const { data, isLoading, isError, needsSchool } = useSchoolScopedQuery({
    key: ["survey", "analytics", cycle],
    queryFn: ({ schoolParam }) =>
      surveyApi.getAnalytics(schoolParam.school_name, cycle === "all" ? undefined : cycle),
    staleTime: 5 * 60_000,
    retry: false,
    requireSchool: true,
  });

  const cycleOptions = useMemo(() => {
    const cycles = data?.cycles ?? [];
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
  }, [data?.cycles]);

  const cycleSelector = cycleOptions && (
    <div className="w-36 sm:w-44">
      <Select
        options={cycleOptions}
        value={cycle}
        onChange={(e) => setCycle(e.target.value)}
        aria-label="Survey cycle"
      />
    </div>
  );

  if (needsSchool) {
    return (
      <CollapsibleSection
        id="dash-survey"
        title="Student feedback"
        description="Select a school to view its feedback"
        defaultOpen={false}
      >
        <SelectSchoolPrompt label="student feedback analytics" />
      </CollapsibleSection>
    );
  }

  if (isLoading) {
    return (
      <CollapsibleSection
        id="dash-survey"
        title="Student feedback"
        description="Loading feedback analytics…"
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartSkeleton className="lg:col-span-2" />
            <ChartSkeleton />
          </div>
        </div>
      </CollapsibleSection>
    );
  }

  if (isError || !data) return null;

  const rec = data.recommendation;
  const overall = data.overall_satisfaction;
  const overallRated = overall.positive + overall.neutral + overall.negative;
  const overallPct =
    !overall.suppressed && overallRated > 0
      ? Math.round((overall.positive / overallRated) * 100)
      : null;
  const trend = data.trend;

  const sectionProps = {
    id: "dash-survey",
    title: "Student feedback",
    description:
      data.scope === "platform"
        ? "Satisfaction across all schools"
        : "How students rate their school experience",
    defaultOpen: false,
    action: (
      <div className="flex items-center gap-3">
        {cycleSelector}
        <Link
          to="/survey/search"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Explore <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    ),
  };

  // No feedback loaded for this school yet — a compact, honest empty state.
  if (data.total_responses === 0) {
    return (
      <CollapsibleSection {...sectionProps}>
        <Card padding="lg">
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <MessagesSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No survey responses yet</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Once feedback is synced from your survey sheet, satisfaction analytics appear here.
            </p>
          </div>
        </Card>
      </CollapsibleSection>
    );
  }

  const dimensions = data.dimensions.filter((d) => d.total > 0 && !d.suppressed);
  const suppressedDimensions = data.dimensions.filter((d) => d.suppressed);
  const dimTrendByKey = new Map((trend?.dimensions ?? []).map((d) => [d.key, d]));

  const visibleClasses = data.by_class.filter((c) => !c.suppressed);
  const suppressedClassCount = data.by_class.length - visibleClasses.length;

  return (
    <CollapsibleSection {...sectionProps}>
    <div className="space-y-4">

      {trend && (
        <p className="text-xs text-muted-foreground">
          Comparing <span className="font-medium text-foreground">{trend.current_cycle}</span> to{" "}
          <span className="font-medium text-foreground">{trend.previous_cycle}</span> ({trend.total_responses_previous} → {trend.total_responses_current} responses)
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Responses"
          value={data.total_responses.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="primary"
          description={
            <span className="flex items-center gap-1.5">
              {`from ${data.responded_classes} ${data.responded_classes === 1 ? "class" : "classes"}`}
              {trend && (
                <TrendDelta
                  delta={trend.total_responses_current - trend.total_responses_previous}
                  suffix=""
                  title={`vs ${trend.previous_cycle}`}
                />
              )}
            </span>
          }
        />
        <StatCard
          label="Overall satisfied"
          value={overallPct != null ? `${overallPct}%` : "—"}
          icon={<Smile className="h-5 w-5" />}
          color={overallPct == null ? "primary" : overallPct >= 75 ? "success" : overallPct >= 50 ? "warning" : "danger"}
          description={
            <span className="flex items-center gap-1.5">
              rate teaching positively
              {trend && trend.overall_positive_pct_current != null && trend.overall_positive_pct_previous != null && (
                <TrendDelta
                  delta={trend.overall_positive_pct_current - trend.overall_positive_pct_previous}
                  title={`vs ${trend.previous_cycle}`}
                />
              )}
            </span>
          }
        />
        <StatCard
          label="Recommend school"
          value={rec.promoters_pct != null ? `${rec.promoters_pct}%` : "—"}
          icon={<ThumbsUp className="h-5 w-5" />}
          color="success"
          description={rec.detractors_pct != null ? `${rec.detractors_pct}% would not` : undefined}
        />
        <StatCard
          label="Avg. recommendation"
          value={rec.average != null ? `${rec.average.toFixed(1)}` : "—"}
          icon={<ThumbsUp className="h-5 w-5" />}
          color="info"
          description={
            <span className="flex items-center gap-1.5">
              out of 5
              {trend && trend.recommendation_avg_current != null && trend.recommendation_avg_previous != null && (
                <TrendDelta
                  delta={Math.round((trend.recommendation_avg_current - trend.recommendation_avg_previous) * 10) / 10}
                  suffix=""
                  title={`vs ${trend.previous_cycle}`}
                />
              )}
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card padding="md" className="lg:col-span-2">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Satisfaction by area</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Share of positive responses per topic</p>
          </div>
          <BarList
            max={100}
            format={(v) => `${v}%`}
            items={dimensions.map((d) => {
              const dTrend = dimTrendByKey.get(d.key);
              return {
                label: d.label,
                value: d.positive_pct ?? 0,
                color: pctColor(d.positive_pct ?? 0),
                hint:
                  dTrend?.delta_pct != null
                    ? (dTrend.delta_pct > 0 ? "+" : "") + `${dTrend.delta_pct}pt`
                    : undefined,
              };
            })}
            emptyLabel="No rated responses yet."
          />
          {suppressedDimensions.length > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {suppressedDimensions.map((d) => d.label).join(", ")}{" "}
              {suppressedDimensions.length === 1 ? "has" : "have"} too few responses to show safely.
            </p>
          )}
        </Card>

        <Card padding="md">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Recommendation spread</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Responses by score (1–5)</p>
          </div>
          {rec.suppressed ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Too few responses to show safely.
            </p>
          ) : rec.responses === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No scores yet.</p>
          ) : (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rec.distribution} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="oklch(var(--border))"
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="score"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    content={<RecTooltip />}
                    cursor={{ fill: "oklch(var(--muted-foreground))", opacity: 0.08 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {rec.distribution.map((d) => (
                      <Cell key={d.score} fill={SCORE_COLORS[d.score - 1] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding="md">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Satisfaction by class</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">% rating teaching positively</p>
          </div>
          <BarList
            max={100}
            format={(v) => `${v}%`}
            items={visibleClasses.map((c) => ({
              label: `Class ${c.class_name}`,
              value: c.positive_pct ?? 0,
              hint: `· ${c.count}`,
              color: pctColor(c.positive_pct ?? 0),
            }))}
            emptyLabel="No class data yet."
          />
          {suppressedClassCount > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {suppressedClassCount} {suppressedClassCount === 1 ? "class has" : "classes have"} too few responses to show safely.
            </p>
          )}
        </Card>

        <Card padding="md">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Toughest subjects</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Most-cited by students</p>
          </div>
          <BarList
            items={data.toughest_subjects.map((s) => ({ label: s.subject, value: s.count }))}
            emptyLabel="No responses yet."
          />
        </Card>
      </div>

      <TopThemesPanel schoolName={schoolName} />
    </div>
    </CollapsibleSection>
  );
}
