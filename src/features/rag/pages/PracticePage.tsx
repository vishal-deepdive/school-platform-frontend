import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Dumbbell,
  Plus,
  Timer,
  User,
} from "lucide-react";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Modal } from "@/shared/components/ui/Modal";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import { CardSkeleton, Skeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { ForbiddenState } from "@/shared/components/errors/ForbiddenState";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { cn, formatDate, getErrorMessage, isForbiddenError } from "@/shared/lib/utils";
import { useAssignment, useAssignments } from "@/features/rag/hooks/useRag";
import { PracticeBuilderModal } from "@/features/rag/components/PracticeBuilderModal";
import { QuizRunner } from "@/features/rag/components/QuizRunner";
import type { AssignmentSummary } from "@/features/rag/types";

type Show = "all" | "todo" | "done" | "self";

const MATCHES: Record<Show, (a: AssignmentSummary) => boolean> = {
  all: () => true,
  todo: (a) => !a.submitted && a.status === "active",
  done: (a) => !!a.submitted,
  self: (a) => a.kind === "self_quiz",
};
const URL_DEFAULTS: { show: string } = { show: "all" };

export function PracticePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAssignments("mine");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [state, update] = useUrlState(URL_DEFAULTS);
  const show: Show = state.show in MATCHES ? (state.show as Show) : "all";

  const { data: activeAssignment, isLoading: loadingActive } = useAssignment(activeId);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["rag", "assignments"] });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const visible = useMemo(() => items.filter(MATCHES[show]), [items, show]);
  const total = data?.pages[0]?.total ?? 0;
  // Per-filter counts are only honest once every page has loaded.
  const allLoaded = !hasNextPage;
  const countFor = (key: Show) => (allLoaded ? items.filter(MATCHES[key]).length : undefined);
  const scored = items.filter((a) => a.submitted && a.my_percentage != null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((n, a) => n + (a.my_percentage ?? 0), 0) / scored.length)
    : null;

  // Ungranted teachers/students land here from the nav; show a clean access
  // message instead of a raw error (matches the Textbook Library pattern).
  if (isError && isForbiddenError(error)) {
    return (
      <ForbiddenState
        title="No access to the Study Assistant"
        description="Your account doesn't have a knowledge-base access grant yet. Ask your principal to enable Study Assistant access for you."
      />
    );
  }

  const loadMore = hasNextPage ? (
    <Button variant="outline" size="sm" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
      Load more
    </Button>
  ) : undefined;

  return (
    <div className="space-y-4">
      <ModuleHeaderActions>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setBuilderOpen(true)}>
          New self-quiz
        </Button>
      </ModuleHeaderActions>

      {isError && <Alert variant="error">{getErrorMessage(error)}</Alert>}

      {isLoading ? (
        <>
          <Skeleton className="h-8 w-72 rounded-lg" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} lines={3} className="h-44" />
            ))}
          </div>
        </>
      ) : items.length === 0 ? (
        !isError && (
          <EmptyState
            icon={<Dumbbell className="h-12 w-12" />}
            title="No practice yet"
            description="Build a self-quiz from any chapter to start practising — or wait for your teacher to assign one."
            action={
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setBuilderOpen(true)}>
                New self-quiz
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentedControl
              aria-label="Show practice"
              value={show}
              onChange={(value) => update({ show: value }, { push: true })}
              options={[
                { value: "all", label: "All", count: countFor("all") },
                { value: "todo", label: "To do", count: countFor("todo") },
                { value: "done", label: "Completed", count: countFor("done") },
                { value: "self", label: "Self-quizzes", count: countFor("self") },
              ]}
            />
            <StatLine
              items={[
                { value: total, label: total === 1 ? "practice set" : "practice sets" },
                { value: `${avgScore}%`, label: "average score", hidden: avgScore === null },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-10 w-10" />}
              title={show === "todo" ? "You're all caught up" : "Nothing here"}
              description={
                hasNextPage
                  ? "Load more to check older practice sets."
                  : show === "todo"
                    ? "No practice is waiting for you right now."
                    : "Nothing matches this filter yet."
              }
              action={loadMore}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((a) => (
                  <PracticeCard key={a.id} assignment={a} onOpen={() => setActiveId(a.id)} />
                ))}
              </div>
              {loadMore && <div className="flex justify-center">{loadMore}</div>}
            </>
          )}
        </>
      )}

      <PracticeBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        mode="self_quiz"
        onCreated={(a) => {
          refresh();
          setActiveId(a.id);
        }}
      />

      <Modal
        open={!!activeId}
        onClose={() => setActiveId(null)}
        title={activeAssignment?.title ?? "Practice"}
        description={
          activeAssignment
            ? [activeAssignment.class_level, activeAssignment.subject, activeAssignment.chapter_name]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        icon={<Dumbbell className="h-5 w-5" />}
        size="3xl"
      >
        {loadingActive || !activeAssignment ? (
          <div className="space-y-3" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <QuizRunner assignment={activeAssignment} onSubmitted={refresh} />
        )}
      </Modal>
    </div>
  );
}

function PracticeCard({
  assignment: a,
  onOpen,
}: {
  assignment: AssignmentSummary;
  onOpen: () => void;
}) {
  const isSelf = a.kind === "self_quiz";
  const submitted = !!a.submitted;
  const closed = a.status !== "active";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={isSelf ? "purple" : "primary"}>{isSelf ? "Self-quiz" : "Assigned"}</Badge>
          {a.medium && (
            <Badge variant={a.medium === "Hindi" ? "purple" : "info"}>{a.medium}</Badge>
          )}
        </div>
        {submitted ? (
          <Badge variant="success">
            {a.my_score}/{a.my_total}
          </Badge>
        ) : closed ? (
          <Badge variant="danger">Closed</Badge>
        ) : (
          <Badge variant="warning">Not started</Badge>
        )}
      </div>

      <div>
        <p className="line-clamp-2 font-medium text-foreground">{a.title}</p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {[a.class_level, a.subject, a.chapter_name].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{a.num_questions} questions</span>
        {a.difficulty && <span>· {a.difficulty}</span>}
        {a.time_limit_seconds ? (
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" /> {Math.round(a.time_limit_seconds / 60)} min
          </span>
        ) : null}
        {submitted ? (
          <span className={cn("inline-flex items-center gap-1", "text-green-600 dark:text-green-400")}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            {a.my_is_late ? " (late)" : ""}
          </span>
        ) : closed ? (
          <span className="inline-flex items-center gap-1 text-destructive">
            <Clock className="h-3.5 w-3.5" /> Past due
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {a.num_questions} to go
          </span>
        )}
      </div>

      {(a.due_at || a.created_by_name) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          {a.due_at && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> Due {formatDate(a.due_at)}
            </span>
          )}
          {!isSelf && a.created_by_name && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {a.created_by_name}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
