import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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
import { ArrowRight, MessagesSquare, Smile, ThumbsUp, Users } from "lucide-react";
import { surveyApi } from "@/features/survey/api/survey";
import { Card, StatCard } from "@/shared/components/ui/Card";
import { ChartSkeleton, StatCardSkeleton } from "@/shared/components/ui/Skeleton";
import { BarList } from "@/features/dashboard/components/BarList";

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

/**
 * Student-feedback satisfaction analytics, rendered from GET /survey/analytics.
 * Surfaces response volume, the recommendation score, per-area satisfaction,
 * and per-class sentiment. Staff-only (admin/principal/teacher); self-hides on
 * an access error.
 */
export function SurveyAnalyticsSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["survey", "analytics"],
    queryFn: () => surveyApi.getAnalytics(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (isLoading) {
    return (
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
    );
  }

  if (isError || !data) return null;

  const rec = data.recommendation;
  const overall = data.overall_satisfaction;
  const overallRated = overall.positive + overall.neutral + overall.negative;
  const overallPct = overallRated > 0 ? Math.round((overall.positive / overallRated) * 100) : null;

  const header = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <MessagesSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Student feedback</h3>
          <p className="text-xs text-muted-foreground">
            {data.scope === "platform"
              ? "Satisfaction across all schools"
              : "How students rate their school experience"}
          </p>
        </div>
      </div>
      <Link
        to="/survey/search"
        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
      >
        Explore <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );

  // No feedback loaded for this school yet — a compact, honest empty state.
  if (data.total_responses === 0) {
    return (
      <div className="space-y-4">
        {header}
        <Card padding="lg">
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <MessagesSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No survey responses yet</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Once feedback is synced from your survey sheet, satisfaction analytics appear here.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const dimensions = data.dimensions.filter((d) => d.total > 0);

  return (
    <div className="space-y-4">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Responses"
          value={data.total_responses.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="primary"
          description={`from ${data.responded_classes} ${data.responded_classes === 1 ? "class" : "classes"}`}
        />
        <StatCard
          label="Overall satisfied"
          value={overallPct != null ? `${overallPct}%` : "—"}
          icon={<Smile className="h-5 w-5" />}
          color={overallPct == null ? "primary" : overallPct >= 75 ? "success" : overallPct >= 50 ? "warning" : "danger"}
          description="rate teaching positively"
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
          description="out of 5"
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
            items={dimensions.map((d) => ({
              label: d.label,
              value: d.positive_pct ?? 0,
              color: pctColor(d.positive_pct ?? 0),
            }))}
            emptyLabel="No rated responses yet."
          />
        </Card>

        <Card padding="md">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Recommendation spread</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Responses by score (1–5)</p>
          </div>
          {rec.responses === 0 ? (
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
            items={data.by_class.map((c) => ({
              label: `Class ${c.class_name}`,
              value: c.positive_pct ?? 0,
              hint: `· ${c.count}`,
              color: pctColor(c.positive_pct ?? 0),
            }))}
            emptyLabel="No class data yet."
          />
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
    </div>
  );
}
