import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, RotateCcw, Timer, AlertTriangle } from "lucide-react";
import toast from "@/shared/lib/toast";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { getErrorMessage, cn } from "@/shared/lib/utils";
import { useSubmitAssignment } from "@/features/rag/hooks/useRag";
import { QuizResult } from "@/features/rag/components/QuizResult";
import type { AssignmentDetail, SubmissionResult } from "@/features/rag/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface QuizRunnerProps {
  assignment: AssignmentDetail;
  /** Called after a successful submit so the caller can refresh lists. */
  onSubmitted?: (result: SubmissionResult) => void;
}

/**
 * Attempt view for an assignment/self-quiz. Renders one card per question with
 * selectable options, then auto-grades on submit and shows the graded result.
 * Supports an optional countdown (auto-submits at 0) and best-effort per-question
 * timing.
 */
export function QuizRunner({ assignment, onSubmitted }: QuizRunnerProps) {
  const [result, setResult] = useState<SubmissionResult | null>(
    assignment.my_submission ?? null,
  );
  const [selections, setSelections] = useState<Record<string, number>>({});
  const startedAt = useRef<number>(Date.now());
  // Best-effort per-question time: elapsed since the previous interaction is
  // attributed to the question just answered.
  const lastEventAt = useRef<number>(Date.now());
  const timePerQuestion = useRef<Record<string, number>>({});
  const { mutate: submit, isPending } = useSubmitAssignment();

  const total = assignment.questions.length;
  const answered = Object.keys(selections).length;
  const orderedQuestions = useMemo(() => assignment.questions, [assignment.questions]);

  const timeLimit = assignment.time_limit_seconds ?? 0;
  const timed = !result && timeLimit > 0;
  const [remaining, setRemaining] = useState(timeLimit);
  const submittedRef = useRef(false);

  const select = (qid: string, oi: number) => {
    const now = Date.now();
    timePerQuestion.current[qid] = (timePerQuestion.current[qid] ?? 0) + (now - lastEventAt.current);
    lastEventAt.current = now;
    setSelections((s) => ({ ...s, [qid]: oi }));
  };

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const answers = orderedQuestions.map((q) => ({
      question_id: q.id,
      selected_index: selections[q.id] ?? null,
      time_ms: timePerQuestion.current[q.id] ?? null,
    }));
    const timeSpent = Math.round((Date.now() - startedAt.current) / 1000);
    submit(
      { id: assignment.id, data: { answers, time_spent_seconds: timeSpent } },
      {
        onSuccess: (res) => {
          setResult(res);
          toast.success(`Scored ${res.score}/${res.total}`);
          onSubmitted?.(res);
        },
        onError: (err) => {
          submittedRef.current = false; // allow a retry after a failed submit
          toast.error(getErrorMessage(err));
        },
      },
    );
  }, [assignment.id, orderedQuestions, selections, submit, onSubmitted]);

  // Keep a ref to the latest submit handler so the countdown effect never runs a
  // stale closure over selections.
  const doSubmitRef = useRef(doSubmit);
  doSubmitRef.current = doSubmit;

  useEffect(() => {
    if (!timed) return;
    const end = startedAt.current + timeLimit * 1000;
    const tick = () => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        toast("Time's up — submitting your answers.");
        doSubmitRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timed, timeLimit]);

  const retake = () => {
    setResult(null);
    setSelections({});
    submittedRef.current = false;
    startedAt.current = Date.now();
    lastEventAt.current = Date.now();
    timePerQuestion.current = {};
    setRemaining(timeLimit);
  };

  if (result) {
    // Self-quizzes are always retakeable; teacher assignments only while attempts
    // remain and the assignment is still open.
    const attemptsAllowed = assignment.attempts_allowed;
    const attemptsLeft =
      attemptsAllowed == null || result.attempt_count < attemptsAllowed;
    const canRetake =
      assignment.kind === "self_quiz" ||
      (attemptsLeft && assignment.status === "active");
    return (
      <div className="space-y-4">
        <QuizResult result={result} />
        {assignment.kind === "assignment" && attemptsAllowed != null && (
          <p className="text-center text-xs text-muted-foreground">
            Attempt {result.attempt_count} of {attemptsAllowed}
            {assignment.scoring === "best" ? " · best score kept" : ""}
          </p>
        )}
        {canRetake && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={retake}>
              Retake quiz
            </Button>
          </div>
        )}
      </div>
    );
  }

  const lowTime = timed && remaining <= 30;

  return (
    <div className="space-y-4">
      {timed && (
        <div
          className={cn(
            "sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm backdrop-blur transition-colors",
            lowTime
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-border bg-card/95 text-foreground",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <Timer className="h-4 w-4" /> Time remaining
          </span>
          <span className={cn("font-semibold tabular-nums", lowTime && "animate-pulse")}>
            {formatClock(remaining)}
          </span>
        </div>
      )}

      <ul className="space-y-4">
        {orderedQuestions.map((q, qi) => (
          <li key={q.id} className="rounded-xl border border-border bg-card p-4 md:p-5 animate-fade-in">
            <p className="mb-3 text-sm font-medium text-foreground">
              <span className="text-muted-foreground">Q{qi + 1}. </span>
              {q.question}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => {
                const selected = selections[q.id] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => select(q.id, oi)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all active:scale-[0.99]",
                      selected
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                        : "border-border/60 text-foreground hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {LETTERS[oi]}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-1 py-3 backdrop-blur">
        <Badge variant={answered === total ? "success" : "info"}>
          {answered} of {total} answered
        </Badge>
        <div className="flex items-center gap-2">
          {answered < total && (
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              <AlertTriangle className="h-3.5 w-3.5" /> Unanswered count as wrong
            </span>
          )}
          <Button
            icon={<Send className="h-4 w-4" />}
            loading={isPending}
            disabled={answered === 0}
            onClick={doSubmit}
          >
            Submit &amp; see results
          </Button>
        </div>
      </div>
    </div>
  );
}
