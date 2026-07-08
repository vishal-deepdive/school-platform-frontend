import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dumbbell,
  Plus,
  CheckCircle2,
  Clock,
  CalendarClock,
  User,
  Timer,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { getErrorMessage, formatDate, cn } from "@/shared/lib/utils";
import { useAssignments, useAssignment } from "@/features/rag/hooks/useRag";
import { PracticeBuilderModal } from "@/features/rag/components/PracticeBuilderModal";
import { QuizRunner } from "@/features/rag/components/QuizRunner";
import type { AssignmentSummary } from "@/features/rag/types";

export function PracticePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAssignments("mine");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: activeAssignment, isLoading: loadingActive } = useAssignment(activeId);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["rag", "assignments"] });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Practice sets assigned to you, plus quizzes you build for yourself.
        </p>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setBuilderOpen(true)}>
          New self-quiz
        </Button>
      </div>

      {isError && <Alert variant="error">{getErrorMessage(error)}</Alert>}

      {items.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-12 w-12" />}
          title="No practice yet"
          description="Build a self-quiz from any chapter to start practising — or wait for your teacher to assign one."
          action={
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setBuilderOpen(true)}>
              New self-quiz
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <PracticeCard key={a.id} assignment={a} onOpen={() => setActiveId(a.id)} />
            ))}
          </div>
          {hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
                Load more
              </Button>
            </div>
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
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60" />
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
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant={isSelf ? "purple" : "primary"}>
          {isSelf ? "Self-quiz" : "Assigned"}
        </Badge>
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
