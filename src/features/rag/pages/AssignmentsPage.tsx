import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Plus,
  BarChart3,
  Trash2,
  Users,
  CalendarClock,
  AlertTriangle,
  TrendingDown,
  Target,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Panel } from "@/shared/components/ui/Panel";
import { Modal } from "@/shared/components/ui/Modal";
import { StatCard } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { getErrorMessage, formatDate, cn } from "@/shared/lib/utils";
import {
  useAssignments,
  useAssignmentResults,
  useDeleteAssignment,
} from "@/features/rag/hooks/useRag";
import { PracticeBuilderModal } from "@/features/rag/components/PracticeBuilderModal";
import type { RagFilters } from "@/features/rag/types";

export function AssignmentsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAssignments("manage");
  const { mutate: remove } = useDeleteAssignment();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [prefillFilters, setPrefillFilters] = useState<RagFilters | undefined>(undefined);
  const [prefillTopic, setPrefillTopic] = useState<string | undefined>(undefined);
  const [resultsId, setResultsId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["rag", "assignments"] });

  const openBlankBuilder = () => {
    setPrefillFilters(undefined);
    setPrefillTopic(undefined);
    setBuilderOpen(true);
  };

  const handleRemediate = (filters: RagFilters, topic: string) => {
    setResultsId(null);
    setPrefillFilters(filters);
    setPrefillTopic(topic);
    setBuilderOpen(true);
  };

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const handleDelete = () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    remove(id, {
      onSuccess: () => {
        toast.success("Assignment deleted.");
        refresh();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Assign auto-graded practice to a class and track how they do.
        </p>
        <Button icon={<Plus className="h-4 w-4" />} onClick={openBlankBuilder}>
          New assignment
        </Button>
      </div>

      {isError && <Alert variant="error">{getErrorMessage(error)}</Alert>}

      {items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No assignments yet"
          description="Generate a quiz from a chapter and assign it to a class. You'll see completion and scores here."
          action={
            <Button icon={<Plus className="h-4 w-4" />} onClick={openBlankBuilder}>
              New assignment
            </Button>
          }
        />
      ) : (
        <Panel flush icon={<ClipboardList className="h-4 w-4" />} title="Your assignments">
          <ul className="divide-y divide-border/50">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{a.title}</p>
                    <Badge variant={a.status === "active" ? "success" : "default"}>
                      {a.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[a.class_level, a.subject, a.chapter_name].filter(Boolean).join(" · ") || "—"}
                    {` · ${a.num_questions} Qs`}
                    {a.difficulty ? ` · ${a.difficulty}` : ""}
                    {a.time_limit_seconds ? ` · ${Math.round(a.time_limit_seconds / 60)} min` : ""}
                    {a.attempts_allowed
                      ? ` · ${a.attempts_allowed} attempt${a.attempts_allowed > 1 ? "s" : ""}`
                      : a.attempts_allowed === null
                        ? " · unlimited attempts"
                        : ""}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="tabular-nums text-foreground">{a.submission_count ?? 0}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                      <span className="tabular-nums text-foreground">
                        {a.avg_percentage != null ? `${a.avg_percentage}%` : "—"}
                      </span>
                    </span>
                    {a.due_at && (
                      <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
                        <CalendarClock className="h-3.5 w-3.5" /> {formatDate(a.due_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<BarChart3 className="h-4 w-4" />}
                      onClick={() => setResultsId(a.id)}
                    >
                      Results
                    </Button>
                    <Button
                      variant="danger-ghost"
                      size="icon"
                      aria-label="Delete assignment"
                      onClick={() => setConfirmId(a.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
            Load more
          </Button>
        </div>
      )}

      <PracticeBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        mode="assignment"
        onCreated={refresh}
        initialFilters={prefillFilters}
        initialTopic={prefillTopic}
      />

      <Modal
        open={!!resultsId}
        onClose={() => setResultsId(null)}
        title="Assignment results"
        icon={<BarChart3 className="h-5 w-5" />}
        size="3xl"
      >
        {resultsId && <ResultsContent assignmentId={resultsId} onRemediate={handleRemediate} />}
      </Modal>

      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Delete this assignment?"
        description="This removes the assignment and all its submissions. This cannot be undone."
        icon={<AlertTriangle className="h-5 w-5" />}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Students will no longer see this assignment or their scores for it.
        </p>
      </Modal>
    </div>
  );
}

function ResultsContent({
  assignmentId,
  onRemediate,
}: {
  assignmentId: string;
  onRemediate: (filters: RagFilters, topic: string) => void;
}) {
  const { data, isLoading, isError, error } = useAssignmentResults(assignmentId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
    );
  }
  if (isError || !data) {
    return <Alert variant="error">{getErrorMessage(error) || "Failed to load results."}</Alert>;
  }

  const { assignment: a } = data;
  const remediate = (topic: string) =>
    onRemediate(
      {
        class_level: a.class_level ?? undefined,
        subject: a.subject ?? undefined,
        chapter_name: a.chapter_name ? [a.chapter_name] : undefined,
      },
      topic,
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="font-medium text-foreground">{a.title}</p>
        <p className="text-xs text-muted-foreground">
          {[a.class_level, a.subject, a.chapter_name].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Submissions" value={data.submission_count} icon={<Users className="h-5 w-5" />} color="primary" />
        <StatCard
          label="Class average"
          value={data.avg_percentage != null ? `${data.avg_percentage}%` : "—"}
          icon={<BarChart3 className="h-5 w-5" />}
          color="info"
        />
        <StatCard label="Questions" value={a.num_questions} icon={<ClipboardList className="h-5 w-5" />} color="success" />
      </div>

      {data.submission_count === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No submissions yet"
          description="Once students attempt this, you'll see per-question accuracy and weak topics here."
          variant="plain"
        />
      ) : (
        <>
          {/* Weak topics */}
          {data.weak_topics.length > 0 && (
            <Panel
              icon={<TrendingDown className="h-4 w-4" />}
              title="Weakest topics"
              description="Lowest class accuracy first — assign targeted practice in one click"
            >
              <ul className="space-y-2">
                {data.weak_topics.slice(0, 5).map((t) => (
                  <li key={t.topic} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm text-foreground sm:w-32" title={t.topic}>
                      {t.topic}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          (t.accuracy_pct ?? 0) < 50 ? "bg-destructive" : "bg-amber-500",
                        )}
                        style={{ width: `${t.accuracy_pct ?? 0}%` }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {t.accuracy_pct ?? 0}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Target className="h-3.5 w-3.5" />}
                      onClick={() => remediate(t.topic)}
                      className="shrink-0 px-1.5 text-xs"
                    >
                      Practise
                    </Button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Per-question accuracy */}
          <Panel flush icon={<BarChart3 className="h-4 w-4" />} title="Per-question accuracy">
            <ul className="divide-y divide-border/50">
              {data.question_stats.map((q, i) => {
                const acc = q.accuracy_pct ?? 0;
                return (
                  <li key={q.question_id} className="px-4 py-3 md:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm text-foreground">
                        <span className="text-muted-foreground">Q{i + 1}. </span>
                        {q.question}
                      </p>
                      <Badge variant={acc >= 70 ? "success" : acc >= 40 ? "warning" : "danger"}>
                        {acc}%
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {q.correct_count}/{q.total_count} correct
                      {q.topic ? ` · ${q.topic}` : ""}
                      {q.avg_time_seconds != null ? ` · ~${q.avg_time_seconds}s avg` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {/* Students */}
          <Panel flush icon={<Users className="h-4 w-4" />} title="Students">
            <ul className="divide-y divide-border/50">
              {data.students.map((s) => (
                <li key={s.student_id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                  <span className="truncate text-sm text-foreground">
                    {s.student_name || "Student"}
                  </span>
                  <div className="flex items-center gap-3">
                    {s.submitted_at && (
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {formatDate(s.submitted_at)}
                      </span>
                    )}
                    <Badge variant={s.percentage >= 70 ? "success" : s.percentage >= 40 ? "warning" : "danger"}>
                      {s.score}/{s.total} · {Math.round(s.percentage)}%
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
