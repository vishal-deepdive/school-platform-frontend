import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Quote, Sparkles } from "lucide-react";
import { surveyApi } from "@/features/survey/api/survey";
import { useSchoolScopedQuery } from "@/shared/hooks/useSchoolScopedQuery";
import { Badge } from "@/shared/components/ui/Badge";
import { Panel } from "@/shared/components/ui/Panel";
import { RefreshButton } from "@/shared/components/ui/RefreshButton";
import type { SurveyThemeSentiment } from "@/features/survey/types";

const SENTIMENT_BADGE: Record<
  SurveyThemeSentiment,
  { variant: "success" | "danger" | "warning"; label: string }
> = {
  positive: { variant: "success", label: "Positive" },
  negative: { variant: "danger", label: "Negative" },
  mixed: { variant: "warning", label: "Mixed" },
};

const TITLE = "Top feedback themes";

/**
 * Recurring feedback themes clustered from open-text embeddings
 * (GET /survey/themes) — turns raw open-ended answers into scannable, labelled
 * patterns without the reader having to know what to ask the AI copilot.
 *
 * Lives in the survey feature (not the dashboard) because both the Feedback
 * Insights page and the dashboard's summary section render it.
 */
export function TopThemesPanel({ schoolName }: { schoolName: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useSchoolScopedQuery({
    key: ["survey", "themes"],
    queryFn: () => surveyApi.getThemes({ schoolName: schoolName || undefined }),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const { mutate: refresh, isPending: refreshing } = useMutation({
    mutationFn: () =>
      surveyApi.getThemes({ schoolName: schoolName || undefined, refresh: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["survey", "themes"] }),
  });

  const icon = <Sparkles className="h-4 w-4" />;

  if (isLoading) {
    return (
      <Panel icon={icon} title={TITLE}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      </Panel>
    );
  }

  if (!data || data.insufficient_data || data.themes.length === 0) {
    return (
      <Panel icon={icon} title={TITLE}>
        <p className="py-4 text-center text-xs text-muted-foreground">
          Not enough open-text feedback yet to surface recurring themes.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      icon={icon}
      title={TITLE}
      description={`Clustered from ${data.sample_size} open-text responses`}
      actions={
        <RefreshButton
          onClick={() => refresh()}
          refreshing={refreshing || isFetching}
          label="Recompute themes now"
        />
      }
    >
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
              <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                {theme.summary}
              </p>
              <span className="text-[11px] font-medium text-muted-foreground">
                {theme.count} {theme.count === 1 ? "mention" : "mentions"}
              </span>
              {theme.sample_quotes.length > 0 && (
                <div className="mt-2 border-t border-border/50 pt-2">
                  <p className="flex items-start gap-1.5 text-xs italic leading-relaxed text-muted-foreground/90">
                    <Quote className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                    <span className="line-clamp-2">{theme.sample_quotes[0]}</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
