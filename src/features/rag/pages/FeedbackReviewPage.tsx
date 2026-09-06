import { useState } from "react";
import {
  MessageSquareWarning,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { StatCard } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Panel } from "@/shared/components/ui/Panel";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { getErrorMessage, formatDateTime } from "@/shared/lib/utils";
import { useFeedbackReview } from "@/features/rag/hooks/useRag";
import type { FeedbackItem } from "@/features/rag/types";

const TABS = [
  { id: "down", label: "Not helpful", icon: <ThumbsDown className="h-4 w-4" /> },
  { id: "all", label: "All", icon: <MessageSquareWarning className="h-4 w-4" /> },
  { id: "up", label: "Helpful", icon: <ThumbsUp className="h-4 w-4" /> },
];

const ratingParam: Record<string, number | undefined> = {
  down: -1,
  up: 1,
  all: undefined,
};

import { Skeleton, StatCardSkeleton, CardSkeleton } from "@/shared/components/ui/Skeleton";

function FeedbackReviewSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}

export function FeedbackReviewPage() {
  const [tab, setTab] = useState("down");
  const { data, isLoading, isError, error } = useFeedbackReview(ratingParam[tab]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const items = data?.items ?? [];
  const helpfulPct =
    data && data.up + data.down > 0
      ? Math.round((data.up / (data.up + data.down)) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Helpful"
          value={data?.up ?? 0}
          icon={<ThumbsUp className="h-5 w-5" />}
          color="success"
        />
        <StatCard
          label="Not helpful"
          value={data?.down ?? 0}
          icon={<ThumbsDown className="h-5 w-5" />}
          color="danger"
        />
        <StatCard
          label="Helpful rate"
          value={helpfulPct != null ? `${helpfulPct}%` : "—"}
          icon={<MessageSquareWarning className="h-5 w-5" />}
          color="info"
          description="Across all rated answers"
        />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {isError && <Alert variant="error">{getErrorMessage(error)}</Alert>}

      {isLoading ? (
        <FeedbackReviewSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MessageSquareWarning className="h-12 w-12" />}
          title={tab === "down" ? "No low-rated answers 🎉" : "No feedback here"}
          description={
            tab === "down"
              ? "When students or teachers thumbs-down an answer, it lands here so you can spot bad content or coverage gaps."
              : "Ratings collected from the Ask-a-Doubt page show up here."
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <FeedbackRow
              key={f.id}
              item={f}
              expanded={expanded.has(f.id)}
              onToggle={() => toggle(f.id)}
            />
          ))}
        </div>
      )}
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
  const chips = [filters.medium, filters.class_level, filters.subject, ...(Array.isArray(filters.chapter_name) ? filters.chapter_name : [])]
    .filter(Boolean)
    .map(String);

  return (
    <Panel flush className="overflow-hidden">
      <div className="px-4 py-4 md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
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
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? (
                <>
                  Hide <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Answer <ChevronDown className="h-3.5 w-3.5" />
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
      </div>
    </Panel>
  );
}
