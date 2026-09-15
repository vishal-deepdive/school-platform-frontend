import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessagesSquare, Smile, ThumbsUp, Users } from "lucide-react";
import { surveyApi } from "@/features/survey/api/survey";
import {
  RecommendationSpread,
  SatisfactionByArea,
  SatisfactionByClass,
  SuppressedNote,
  ToughestSubjects,
  TrendDelta,
} from "@/features/survey/components/analytics";
import { TopThemesPanel } from "@/features/survey/components/TopThemesPanel";
import { Card, StatCard } from "@/shared/components/ui/Card";
import { CollapsibleSection } from "@/shared/components/ui/CollapsibleSection";
import { ChartSkeleton, StatCardSkeleton } from "@/shared/components/ui/Skeleton";
import { Select } from "@/shared/components/ui/Select";
import { useSchoolScopedQuery } from "@/shared/hooks/useSchoolScopedQuery";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { SelectSchoolPrompt } from "@/features/dashboard/components/SelectSchoolPrompt";

/** Card wrapper for one chart on this section. */
function ChartCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="md" className={className}>
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}

/**
 * Student-feedback summary for the main dashboard — the same charts as the
 * Feedback Insights module page, rendered from the shared components in
 * `features/survey/components/analytics` so the two can never disagree about
 * how satisfaction is coloured, suppressed or labelled. The module page is the
 * full view; this is the "is anything wrong?" glance, with a link across.
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
        {cycleOptions && (
          <div className="w-36 sm:w-44">
            <Select
              options={cycleOptions}
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
              aria-label="Survey cycle"
            />
          </div>
        )}
        <Link
          to="/survey"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Full insights <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    ),
  };

  if (data.total_responses === 0) {
    return (
      <CollapsibleSection {...sectionProps}>
        <Card padding="lg">
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <MessagesSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No survey responses yet</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Once feedback is synced from your survey sheet, satisfaction analytics appear
              here.
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
            Comparing <span className="font-medium text-foreground">{trend.current_cycle}</span>{" "}
            to <span className="font-medium text-foreground">{trend.previous_cycle}</span> (
            {trend.total_responses_previous} → {trend.total_responses_current} responses)
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
            color={
              overallPct == null
                ? "primary"
                : overallPct >= 75
                  ? "success"
                  : overallPct >= 50
                    ? "warning"
                    : "danger"
            }
            description={
              <span className="flex items-center gap-1.5">
                rate teaching positively
                {trend &&
                  trend.overall_positive_pct_current != null &&
                  trend.overall_positive_pct_previous != null && (
                    <TrendDelta
                      delta={
                        trend.overall_positive_pct_current -
                        trend.overall_positive_pct_previous
                      }
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
            description={
              rec.detractors_pct != null ? `${rec.detractors_pct}% would not` : undefined
            }
          />
          <StatCard
            label="Avg. recommendation"
            value={rec.average != null ? `${rec.average.toFixed(1)}` : "—"}
            icon={<ThumbsUp className="h-5 w-5" />}
            color="info"
            description={
              <span className="flex items-center gap-1.5">
                out of 5
                {trend &&
                  trend.recommendation_avg_current != null &&
                  trend.recommendation_avg_previous != null && (
                    <TrendDelta
                      delta={
                        Math.round(
                          (trend.recommendation_avg_current -
                            trend.recommendation_avg_previous) *
                            10,
                        ) / 10
                      }
                      suffix=""
                      title={`vs ${trend.previous_cycle}`}
                    />
                  )}
              </span>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Satisfaction by area"
            subtitle="Share of positive responses per topic"
          >
            <SatisfactionByArea dimensions={dimensions} trendByKey={dimTrendByKey} />
            <SuppressedNote
              count={suppressedDimensions.length}
              noun="area"
              names={suppressedDimensions.map((d) => d.label)}
            />
          </ChartCard>

          <ChartCard title="Recommendation spread" subtitle="Responses by score (1–5)">
            <RecommendationSpread recommendation={rec} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Satisfaction by class" subtitle="% rating teaching positively">
            <SatisfactionByClass classes={visibleClasses} />
            <SuppressedNote count={suppressedClassCount} noun="class" />
          </ChartCard>

          <ChartCard title="Toughest subjects" subtitle="Most-cited by students">
            <ToughestSubjects subjects={data.toughest_subjects} />
          </ChartCard>
        </div>

        <TopThemesPanel schoolName={schoolName} />
      </div>
    </CollapsibleSection>
  );
}
