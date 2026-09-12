import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Languages,
  Layers,
  Library,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  Zap,
} from "lucide-react";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiStrip, type KpiItem } from "@/shared/components/ui/KpiStrip";
import {
  ModuleHeaderActions,
  ModuleHeaderLeading,
} from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { RefreshButton } from "@/shared/components/ui/RefreshButton";
import { CardSkeleton, Skeleton } from "@/shared/components/ui/Skeleton";
import { ForbiddenState } from "@/shared/components/errors/ForbiddenState";
import { getErrorMessage, isForbiddenError } from "@/shared/lib/utils";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import {
  useRagAnalytics,
  useRagMediums,
  useUsageAnalytics,
} from "@/features/rag/hooks/useRag";

/** A horizontal breakdown list with a proportional fill bar per row. */
function BreakdownList({
  rows,
  total,
  emptyLabel,
}: {
  rows: { label: string; count: number }[];
  total: number;
  emptyLabel: string;
}) {
  if (!rows.length) {
    return <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">{emptyLabel}</p>;
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="divide-y divide-border/50">
      {rows.map((row) => {
        const barPct = Math.round((row.count / max) * 100);
        const sharePct = total > 0 ? Math.round((row.count / total) * 100) : null;
        return (
          <li key={row.label} className="px-4 py-3 md:px-5">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-foreground">{row.label}</p>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {row.count.toLocaleString()}
                {sharePct !== null && ` · ${sharePct}%`}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${barPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Segmented ingest-health bar: completed / pending / failed. */
function IngestHealthBar({
  completed,
  pending,
  failed,
}: {
  completed: number;
  pending: number;
  failed: number;
}) {
  const total = completed + pending + failed;
  if (total === 0) return null;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="space-y-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {completed > 0 && <div className="h-full bg-green-500" style={{ width: seg(completed) }} />}
        {pending > 0 && <div className="h-full bg-amber-500" style={{ width: seg(pending) }} />}
        {failed > 0 && <div className="h-full bg-destructive" style={{ width: seg(failed) }} />}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          {completed.toLocaleString()} ready
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          {pending.toLocaleString()} processing
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          {failed.toLocaleString()} failed
        </span>
      </div>
    </div>
  );
}

const statusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return <Badge variant="success">Ready</Badge>;
    case "failed":
      return <Badge variant="danger">Failed</Badge>;
    default:
      return (
        <Badge variant="warning" className="capitalize">
          {status}
        </Badge>
      );
  }
};

const CORPUS_KPIS: KpiItem[] = [
  { label: "Documents", value: null, icon: <Library />, hint: "" },
  { label: "Indexed passages", value: null, icon: <Database />, hint: "" },
  { label: "Subjects", value: null, icon: <BookOpen /> },
  { label: "Class levels", value: null, icon: <Layers /> },
];

function RagInsightsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <KpiStrip loading items={CORPUS_KPIS} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} lines={4} />
        ))}
      </div>
    </div>
  );
}

export function RagInsightsPage() {
  // Admins scope to the active school; with none selected they see platform-wide
  // totals. Staff are scoped server-side (schoolId is their own, harmless here).
  const { schoolId, schoolName, isAdmin } = useActiveSchool();
  const { data, isLoading, isError, error, refetch, isFetching } = useRagAnalytics(schoolId);
  const { data: mediumData } = useRagMediums();

  const subjectRows = useMemo(
    () => (data?.by_subject ?? []).map((s) => ({ label: s.subject || "Unspecified", count: s.count })),
    [data],
  );
  const classRows = useMemo(
    () => (data?.by_class ?? []).map((c) => ({ label: c.class_level || "Unspecified", count: c.count })),
    [data],
  );
  const mediumRows = useMemo(
    () => (data?.by_medium ?? []).map((m) => ({ label: m.medium || "Unspecified", count: m.count })),
    [data],
  );

  // Ungranted teachers: clean access message instead of a raw error alert.
  if (isError && isForbiddenError(error)) {
    return (
      <ForbiddenState
        title="No access to Library Insights"
        description="Your account doesn't have a knowledge-base access grant yet. Ask your principal to enable Study Assistant access for you."
      />
    );
  }

  const scopeLabel =
    data?.scope === "platform"
      ? "Platform-wide"
      : isAdmin && schoolName
        ? `${schoolName} + global`
        : "Your school + global";

  const header = (
    <>
      {data && (
        <ModuleHeaderLeading>
          <Badge
            variant={data.scope === "platform" ? "primary" : "info"}
            className="hidden max-w-[16rem] truncate sm:inline-flex"
          >
            {scopeLabel}
          </Badge>
          {!isAdmin && mediumData && mediumData.mediums.length > 0 && (
            <Badge variant="purple" className="hidden md:inline-flex">
              <Languages className="mr-1 h-3 w-3" />
              {mediumData.mediums.join(" + ")}
            </Badge>
          )}
        </ModuleHeaderLeading>
      )}
      <ModuleHeaderActions>
        <RefreshButton
          onClick={() => void refetch()}
          refreshing={isFetching && !isLoading}
          label="Refresh insights"
        />
      </ModuleHeaderActions>
    </>
  );

  if (isLoading) {
    return (
      <>
        {header}
        <RagInsightsSkeleton />
      </>
    );
  }
  if (isError) {
    return (
      <div className="space-y-6">
        {header}
        <Alert variant="error">
          {getErrorMessage(error) || "Failed to load knowledge-base analytics."}
        </Alert>
      </div>
    );
  }

  const totals = data?.totals;
  const isEmpty = !totals || totals.documents === 0;

  return (
    <div className="space-y-6">
      {header}

      {isEmpty ? (
        <EmptyState
          icon={<Library className="h-12 w-12" />}
          title="Your knowledge base is empty"
          description="Upload textbook chapters to start building searchable content and see insights here."
          action={
            <Button asChild size="sm">
              <Link to="/rag/documents">Open Textbook Library</Link>
            </Button>
          }
        />
      ) : (
        <>
          <KpiStrip
            items={[
              {
                label: "Documents",
                value: totals.documents.toLocaleString(),
                icon: <Library />,
                hint: `${totals.global_docs.toLocaleString()} global · ${totals.school_docs.toLocaleString()} school`,
              },
              {
                label: "Indexed passages",
                value: totals.chunks.toLocaleString(),
                icon: <Database />,
                hint: "Searchable by Ask a Doubt",
              },
              { label: "Subjects", value: totals.subjects.toLocaleString(), icon: <BookOpen /> },
              { label: "Class levels", value: totals.class_levels.toLocaleString(), icon: <Layers /> },
            ]}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel
              icon={<CheckCircle2 className="h-4 w-4" />}
              title="Ingestion health"
              description="Processing status across uploaded documents"
              actions={
                totals.failed > 0 ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/rag/documents?view=all&status=failed">Review failed</Link>
                  </Button>
                ) : undefined
              }
            >
              <IngestHealthBar
                completed={totals.completed}
                pending={totals.pending}
                failed={totals.failed}
              />
            </Panel>

            <Panel
              icon={<ThumbsUp className="h-4 w-4" />}
              title="Answer quality"
              description="Ratings on generated answers"
              actions={
                data?.feedback && data.feedback.total > 0 ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/rag/review">Review answers</Link>
                  </Button>
                ) : undefined
              }
            >
              {!data?.feedback || data.feedback.total === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No answer ratings yet. Thumbs up/down on answers in “Ask a Doubt” will show up
                  here.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
                        {data.feedback.helpful_pct ?? 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        rated helpful · {data.feedback.total.toLocaleString()} total
                      </p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <ThumbsUp className="h-4 w-4" />
                        {data.feedback.up.toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-destructive">
                        <ThumbsDown className="h-4 w-4" />
                        {data.feedback.down.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${data.feedback.helpful_pct ?? 0}%` }}
                    />
                    <div className="h-full flex-1 bg-destructive" />
                  </div>
                </div>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel
              flush
              icon={<BookOpen className="h-4 w-4" />}
              title="Documents by subject"
              actions={<Badge variant="info">{subjectRows.length}</Badge>}
            >
              <BreakdownList rows={subjectRows} total={totals.documents} emptyLabel="No subject data yet." />
            </Panel>
            <Panel
              flush
              icon={<Layers className="h-4 w-4" />}
              title="Documents by class"
              actions={<Badge variant="info">{classRows.length}</Badge>}
            >
              <BreakdownList rows={classRows} total={totals.documents} emptyLabel="No class data yet." />
            </Panel>
            <Panel
              flush
              icon={<Languages className="h-4 w-4" />}
              title="Documents by medium"
              actions={<Badge variant="info">{mediumRows.length}</Badge>}
            >
              <BreakdownList rows={mediumRows} total={totals.documents} emptyLabel="No medium data yet." />
            </Panel>
          </div>

          <Panel
            flush
            icon={<FileText className="h-4 w-4" />}
            title="Recent uploads"
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/rag/documents">Open library</Link>
              </Button>
            }
          >
            {!data?.recent?.length ? (
              <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">No recent uploads.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {data.recent.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {doc.chapter_name || "Untitled chapter"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[doc.class_level, doc.subject].filter(Boolean).join(" · ") || "—"}
                        {doc.is_global && " · Global"}
                        {typeof doc.total_chunks === "number" && ` · ${doc.total_chunks} passages`}
                      </p>
                    </div>
                    {statusBadge(doc.status)}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <AdoptionSection />
        </>
      )}
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  qa: "Doubts asked",
  questions: "Worksheets",
  notes: "Smart notes",
  quiz: "Practice generated",
  self_quiz_create: "Self-quizzes made",
  assignment_create: "Assignments set",
  practice_submit: "Practice attempts",
  self_quiz_submit: "Self-quiz attempts",
  flashcards: "Flashcard decks",
  lesson_plan: "Lesson plans",
};

/** Trailing-30-day RAG adoption: totals, by-feature/day breakdown, top users. */
function AdoptionSection() {
  const { schoolId } = useActiveSchool();
  const { data, isLoading } = useUsageAnalytics(30, schoolId);

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }
  if (!data || data.total_events === 0) return null;

  const eventRows = data.by_event.map((e) => ({
    label: EVENT_LABELS[e.event_type] ?? e.event_type,
    count: e.count,
  }));
  const maxDay = Math.max(...data.by_day.map((d) => d.count), 1);

  return (
    <section className="space-y-4" aria-labelledby="adoption-heading">
      <div className="flex items-center gap-2 pt-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 id="adoption-heading" className="font-display text-lg font-semibold text-foreground">
          Adoption
        </h2>
        <Badge variant="default">Last {data.window_days} days</Badge>
      </div>

      <KpiStrip
        items={[
          {
            label: "Total activity",
            value: data.total_events.toLocaleString(),
            icon: <Zap />,
            hint: "Actions across all Study Assistant tools",
          },
          {
            label: "Active users",
            value: data.active_users.toLocaleString(),
            icon: <UserCheck />,
            hint: "Distinct people using it",
          },
          { label: "Features used", value: data.by_event.length, icon: <Activity /> },
        ]}
      />

      <Panel icon={<Activity className="h-4 w-4" />} title="Activity over time">
        <div className="flex h-28 items-end gap-1">
          {data.by_day.map((d) => (
            <div
              key={d.date}
              className="flex-1 rounded-t bg-primary/70 transition-colors hover:bg-primary"
              style={{ height: `${Math.max((d.count / maxDay) * 100, 3)}%` }}
              title={`${d.date}: ${d.count}`}
            />
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel flush icon={<Zap className="h-4 w-4" />} title="By feature">
          <BreakdownList rows={eventRows} total={data.total_events} emptyLabel="No activity yet." />
        </Panel>

        <Panel flush icon={<UserCheck className="h-4 w-4" />} title="Most active users">
          {data.top_users.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">No users yet.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {data.top_users.map((u, i) => (
                <li key={u.user_id ?? i} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{u.user_name || "User"}</p>
                      {u.role && <p className="text-xs capitalize text-muted-foreground">{u.role}</p>}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {u.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}
