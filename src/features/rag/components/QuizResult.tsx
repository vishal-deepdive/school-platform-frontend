import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { Badge } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/lib/utils";
import type { SubmissionResult } from "@/features/rag/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function scoreTone(pct: number) {
  if (pct >= 75) return { ring: "text-green-500", label: "Great work" };
  if (pct >= 40) return { ring: "text-amber-500", label: "Keep practising" };
  return { ring: "text-destructive", label: "Needs revision" };
}

/** Graded breakdown of a submitted attempt: score ring + per-question review. */
export function QuizResult({ result }: { result: SubmissionResult }) {
  const pct = Math.round(result.percentage);
  const tone = scoreTone(pct);
  const circumference = 2 * Math.PI * 34;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Score summary */}
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:justify-center sm:gap-8">
        <div className="relative h-24 w-24 shrink-0">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" className="fill-none stroke-muted" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="34"
              className={cn("fill-none transition-all duration-700", tone.ring)}
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-xl font-bold tabular-nums text-foreground">
              {pct}%
            </span>
          </div>
        </div>
        <div className="text-center sm:text-left">
          <p className="font-display text-2xl font-semibold text-foreground">
            {result.score} / {result.total} correct
          </p>
          <p className="text-sm text-muted-foreground">{tone.label}</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {result.attempt_count > 1 && (
              <span className="text-xs text-muted-foreground">Attempt #{result.attempt_count}</span>
            )}
            {result.is_late && <Badge variant="warning">Submitted late</Badge>}
          </div>
        </div>
      </div>

      {/* Per-question review */}
      <ul className="space-y-4">
        {result.results.map((r, qi) => (
          <li
            key={r.question_id}
            className="rounded-xl border border-border bg-card p-4 md:p-5"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                <span className="text-muted-foreground">Q{qi + 1}. </span>
                {r.question}
              </p>
              {r.correct ? (
                <Badge variant="success">Correct</Badge>
              ) : r.selected_index === null || r.selected_index === undefined ? (
                <Badge variant="warning">Skipped</Badge>
              ) : (
                <Badge variant="danger">Incorrect</Badge>
              )}
            </div>

            <ul className="space-y-1.5">
              {r.options.map((opt, oi) => {
                const isCorrect = oi === r.answer_index;
                const isChosen = oi === r.selected_index;
                return (
                  <li
                    key={oi}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      isCorrect
                        ? "border-green-500/40 bg-green-500/10 text-foreground"
                        : isChosen
                          ? "border-destructive/40 bg-destructive/10 text-foreground"
                          : "border-border/60 text-muted-foreground",
                    )}
                  >
                    <span className="font-semibold tabular-nums">{LETTERS[oi]}.</span>
                    <span className="flex-1">{opt}</span>
                    {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />}
                    {isChosen && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                  </li>
                );
              })}
            </ul>

            {r.explanation && (
              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {r.correct ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <MinusCircle className="h-3.5 w-3.5" />
                  )}
                  Explanation
                </p>
                <div className="text-sm text-foreground">
                  <MarkdownRenderer content={r.explanation} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
