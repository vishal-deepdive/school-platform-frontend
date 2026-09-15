import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  MessageSquareWarning,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { Tabs } from "@/shared/components/ui/Tabs";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { cn, formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useFeedbackReview } from "@/features/rag/hooks/useRag";
import type { FeedbackItem } from "@/features/rag/types";

const RATING_PARAM: Record<string, number | undefined> = {
  down: -1,
  all: undefined,
  up: 1,
};
const URL_DEFAULTS: { rating: string } = { rating: "down" };

export function FeedbackReviewPage() {
  const [state, update] = useUrlState(URL_DEFAULTS);
  const tab = state.rating in RATING_PARAM ? state.rating : "down";
  const { data, isLoading, isError, error, isPlaceholderData } = useFeedbackReview(
    RATING_PARAM[tab],
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const items = data?.items ?? [];
  const rated = data ? data.up + data.down : undefined;
  const helpfulPct = data && rated ? Math.round((data.up / rated) * 100) : null;

  const tabs = [
    { id: "down", label: "Not helpful", icon: <ThumbsDown className="h-4 w-4" />, count: data?.down },
    { id: "all", label: "All", icon: <MessageSquareWarning className="h-4 w-4" />, count: rated },
    { id: "up", label: "Helpful", icon: <ThumbsUp className="h-4 w-4" />, count: data?.up },
  ];

  return (
    <div className="space-y-4">
      <StatLine
        loading={isLoading}
        items={[
          {
            value: helpfulPct != null ? `${helpfulPct}%` : "—",
            label: "of rated answers were helpful",
            tone:
              helpfulPct == null
                ? "default"
                : helpfulPct >= 70
                  ? "success"
                  : helpfulPct < 50
                    ? "danger"
                    : "default",
          },
          { value: rated ?? 0, label: rated === 1 ? "rating" : "ratings" },
        ]}
      />

      {isError && <Alert variant="error">{getErrorMessage(error)}</Alert>}

      <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
        <Tabs
          size="sm"
          tabs={tabs}
          active={tab}
          onChange={(id) => update({ rating: id }, { push: true })}
          className="px-2 md:px-3"
        />
        {isLoading ? (
          <ListSkeleton items={4} />
        ) : items.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<MessageSquareWarning className="h-10 w-10" />}
            title={tab === "down" ? "No low-rated answers" : "No feedback here"}
            description={
              tab === "down"
                ? "When students or teachers thumbs-down an answer, it lands here so you can spot bad content or coverage gaps."
                : "Ratings collected from the Ask a Doubt page show up here."
            }
          />
        ) : (
          <>
            <ul
              className={cn(
                "divide-y divide-border/50 transition-opacity",
                isPlaceholderData && "opacity-60",
              )}
              aria-busy={isPlaceholderData}
            >
              {items.map((f) => (
                <FeedbackRow
                  key={f.id}
                  item={f}
                  expanded={expanded.has(f.id)}
                  onToggle={() => toggle(f.id)}
                />
              ))}
            </ul>
            {data && data.total > items.length && (
              <p className="border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground md:px-5">
                Showing the latest {items.length} of {data.total.toLocaleString()}.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function FeedbackRow({
  item,
  expanded,
  onToggle,
}: {
  item: FeedbackItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const filters = item.filters ?? {};
  const chips = [
    filters.medium,
    filters.class_level,
    filters.subject,
    ...(Array.isArray(filters.chapter_name) ? filters.chapter_name : []),
  ]
    .filter(Boolean)
    .map(String);

  return (
    <li className="px-4 py-3.5 md:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {item.rating === 1 ? (
              <Badge variant="success">
                <ThumbsUp className="mr-1 inline h-3 w-3" /> Helpful
              </Badge>
            ) : (
              <Badge variant="danger">
                <ThumbsDown className="mr-1 inline h-3 w-3" /> Not helpful
              </Badge>
            )}
            {chips.map((c) => (
              <Badge key={c} variant="default">
                {c}
              </Badge>
            ))}
          </div>
          <p className="font-medium text-foreground">{item.question || "—"}</p>
        </div>
        {item.answer && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {expanded ? (
              <>
                Hide answer <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Show answer <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      {item.comment && (
        <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm italic text-muted-foreground">
          “{item.comment}”
        </p>
      )}

      {expanded && item.answer && (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm animate-fade-in">
          <MarkdownRenderer content={item.answer} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {item.user_name && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" /> {item.user_name}
          </span>
        )}
        {item.created_at && <span>{formatDateTime(item.created_at)}</span>}
      </div>
    </li>
  );
}
