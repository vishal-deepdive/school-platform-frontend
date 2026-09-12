import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  Users,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { ActionMenu } from "@/shared/components/ui/ActionMenu";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiStrip } from "@/shared/components/ui/KpiStrip";
import { Modal } from "@/shared/components/ui/Modal";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { ListSkeleton, Skeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { ForbiddenState } from "@/shared/components/errors/ForbiddenState";
import { cn, formatDate, getErrorMessage, isForbiddenError } from "@/shared/lib/utils";
import {
  useAssignmentResults,
  useAssignments,
  useDeleteAssignment,
} from "@/features/rag/hooks/useRag";
import { PracticeBuilderModal } from "@/features/rag/components/PracticeBuilderModal";
import type { AssignmentSummary, RagFilters } from "@/features/rag/types";

function describeAssignment(a: AssignmentSummary): string {
  const parts = [a.class_level, a.subject, a.chapter_name].filter(Boolean) as string[];
  parts.push(`${a.num_questions} Qs`);
  if (a.difficulty) parts.push(a.difficulty);
  if (a.time_limit_seconds) parts.push(`${Math.round(a.time_limit_seconds / 60)} min`);
  if (a.attempts_allowed) {
    parts.push(`${a.attempts_allowed} attempt${a.attempts_allowed > 1 ? "s" : ""}`);
  } else if (a.attempts_allowed === null) {
    parts.push("unlimited attempts");
  }
  return parts.join(" · ");
}

interface BuilderPrefill {
  filters?: RagFilters;
  topic?: string;
}

export function AssignmentsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAssignments("manage");
  const { mutate: remove, isPending: deleting } = useDeleteAssignment();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [prefill, setPrefill] = useState<BuilderPrefill>({});
  const [resultsId, setResultsId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AssignmentSummary | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["rag", "assignments"] });

  const openBuilder = (next: BuilderPrefill = {}) => {
    setPrefill(next);
    setBuilderOpen(true);
  };

  const handleRemediate = (filters: RagFilters, topic: string) => {
    setResultsId(null);
    openBuilder({ filters, topic });
  };

  const handleDelete = () => {
    if (!toDelete) return;
    remove(toDelete.id, {
      onSuccess: () => {
        toast.success("Assignment deleted.");
        setToDelete(null);
        refresh();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  // Ungranted teachers: clean access message instead of a raw error alert
  // alongside a misleading "No assignments yet" empty state.
  if (isError && isForbiddenError(error)) {
    return (
      <ForbiddenState
        title="No access to Assignments"
        description="Your account doesn't have a knowledge-base access grant yet. Ask your principal to enable Study Assistant access for you."
      />
    );
  }

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  // Counts across rows are only true once every page is loaded.
  const allLoaded = !hasNextPage;
  const activeCount = items.filter((a) => a.status === "active").length;
  const submissions = items.reduce((n, a) => n + (a.submission_count ?? 0), 0);

  return (
    <div className="space-y-4">
      <ModuleHeaderActions>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openBuilder()}>
          New assignment
        </Button>
      </ModuleHeaderActions>

      {isError && <Alert variant="error">{getErrorMessage(error)}</Alert>}

      {isLoading ? (
        <>
          <Skeleton className="h-4 w-56" />
          <Panel flush>
            <ListSkeleton items={4} />
          </Panel>
        </>
      ) : items.length === 0 ? (
        !isError && (
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title="No assignments yet"
            description="Generate a quiz from a chapter and assign it to a class. You'll see completion and scores here."
            action={
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openBuilder()}>
                New assignment
              </Button>
            }
          />
        )
      ) : (
        <>
          <StatLine
            items={[
              { value: total, label: total === 1 ? "assignment" : "assignments" },
              { value: activeCount, label: "active", hidden: !allLoaded },
              {
                value: submissions,
                label: submissions === 1 ? "submission" : "submissions",
                hidden: !allLoaded,
              },
            ]}
          />
          <Panel flush>
            <ul className="divide-y divide-border/50">
              {items.map((a) => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  onResults={() => setResultsId(a.id)}
                  onDelete={() => setToDelete(a)}
                />
              ))}
            </ul>
          </Panel>
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      <PracticeBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        mode="assignment"
        onCreated={refresh}
        initialFilters={prefill.filters}
        initialTopic={prefill.topic}
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

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this assignment?"
        description={
          toDelete && (
            <>
              <span className="font-medium text-foreground">{toDelete.title}</span> and all of
              its submissions will be removed. Students will no longer see it or their scores.
              This can't be undone.
            </>
          )
        }
        confirmLabel="Delete assignment"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function AssignmentRow({
  assignment: a,
  onResults,
  onDelete,
}: {
  assignment: AssignmentSummary;
  onResults: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{a.title}</p>
          {a.medium && (
            <Badge variant={a.medium === "Hindi" ? "purple" : "info"}>{a.medium}</Badge>
          )}
          <Badge variant={a.status === "active" ? "success" : "default"} className="capitalize">
            {a.status}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{describeAssignment(a)}</p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 md:justify-end">
        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground" title="Submissions">
            <Users className="h-4 w-4" />
            <span className="sr-only">Submissions:</span>
            <span className="tabular-nums text-foreground">{a.submission_count ?? 0}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground" title="Class average">
            <BarChart3 className="h-4 w-4" />
            <span className="sr-only">Class average:</span>
            <span className="tabular-nums text-foreground">
              {a.avg_percentage != null ? `${a.avg_percentage}%` : "—"}
            </span>
          </span>
          {a.due_at && (
            <span
              className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"
              title="Due date"
            >
              <CalendarClock className="h-3.5 w-3.5" /> {formatDate(a.due_at)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" icon={<BarChart3 className="h-4 w-4" />} onClick={onResults}>
            Results
          </Button>
          <ActionMenu
            label={`More actions for ${a.title}`}
            items={[
              {
                label: "Delete assignment",
                icon: <Trash2 />,
                danger: true,
                onSelect: onDelete,
              },
            ]}
          />
        </div>
      </div>
    </li>
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
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
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

      <KpiStrip
        items={[
          { label: "Submissions", value: data.submission_count, icon: <Users /> },
          {
            label: "Class average",
            value: data.avg_percentage != null ? `${data.avg_percentage}%` : "—",
            icon: <BarChart3 />,
          },
          { label: "Questions", value: a.num_questions, icon: <ClipboardList /> },
        ]}
      />

      {data.submission_count === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No submissions yet"
          description="Once students attempt this, you'll see per-question accuracy and weak topics here."
          variant="plain"
        />
      ) : (
        <>
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

          <Panel flush icon={<Users className="h-4 w-4" />} title="Students">
            <ul className="divide-y divide-border/50">
              {data.students.map((s) => (
                <li key={s.student_id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                  <span className="truncate text-sm text-foreground">{s.student_name || "Student"}</span>
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
