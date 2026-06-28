import { useState } from "react";
import { HelpCircle } from "lucide-react";
import toast from "react-hot-toast";
import { ragApi } from "@/features/rag/api/rag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { StreamingResultPanel } from "@/features/rag/components/StreamingResultPanel";
import { useStreamBatcher } from "@/features/rag/hooks/useStreamBatcher";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { useRagUiStore } from "@/features/rag/store/ragUiStore";
import type { QuestionType, Difficulty } from "@/features/rag/types";
import type { SelectOption } from "@/shared/types/common";

const qTypeOptions: SelectOption[] = [
  { value: "MCQ", label: "Multiple Choice (MCQ)" },
  { value: "BRIEF", label: "Short Answer (Brief)" },
];

const difficultyOptions: SelectOption[] = [
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
];

const difficultyBadge: Record<Difficulty, "success" | "warning" | "danger"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

export function QuestionsPage() {
  const { filters, qType, difficulty, numQuestions, marks, result, isPending } =
    useRagUiStore((s) => s.questions);
  const setFilters = useRagUiStore((s) => s.setQuestionsFilters);
  const setConfig = useRagUiStore((s) => s.setQuestionsConfig);
  const setPending = useRagUiStore((s) => s.setQuestionsPending);
  const setResult = useRagUiStore((s) => s.setQuestionsResult);
  const appendResult = useRagUiStore((s) => s.appendQuestionsResult);
  const { push: queueToken, flush: flushPending } = useStreamBatcher(appendResult);

  // Holds the error from the last failed run so we can offer a retry.
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setResult("");
    setError(null);
    setPending(true);
    try {
      for await (const event of ragApi.generateQuestionsStream({
        filters,
        q_type: qType,
        difficulty,
        num_questions: numQuestions ?? 10,
        ...(marks != null && { marks }),
      })) {
        if (event.type === "token") {
          queueToken(event.content);
        } else if (event.type === "error") {
          flushPending();
          setError(event.message);
          toast.error(event.message);
        } else if (event.type === "done") {
          flushPending();
          toast.success(`${numQuestions} question(s) generated!`);
        }
      }
    } catch (err) {
      flushPending();
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      flushPending();
      setPending(false);
    }
  };

  const canGenerate =
    !!filters.class_level &&
    !!filters.subject &&
    (qType !== "BRIEF" || marks != null);

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 gap-6 ${(result !== null || isPending) ? "lg:grid-cols-3" : ""}`}>
        <Card className={(result !== null || isPending) ? "lg:col-span-1" : "w-full"}>
          <CardHeader title="Configuration" />

          <RagFilterPanel filters={filters} onChange={setFilters} />

          <div className="mt-4 space-y-4">
            <Select
              label="Question Type"
              options={qTypeOptions}
              value={qType}
              onChange={(e) =>
                setConfig({ qType: e.target.value as QuestionType })
              }
            />
            <Select
              label="Difficulty"
              options={difficultyOptions}
              value={difficulty}
              onChange={(e) =>
                setConfig({ difficulty: e.target.value as Difficulty })
              }
            />
            <Input
              label="Number of Questions"
              type="number"
              min={2}
              max={100}
              value={numQuestions ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setConfig({ numQuestions: undefined });
                } else {
                  const n = parseInt(val);
                  setConfig({ numQuestions: isNaN(n) ? undefined : n });
                }
              }}
              onBlur={() => {
                const val = numQuestions ?? 10;
                setConfig({ numQuestions: Math.min(100, Math.max(2, val)) });
              }}
              hint="Between 2 and 100 per batch"
            />
            {qType === "BRIEF" && (
              <Input
                label="Marks per Question"
                type="number"
                min={1}
                max={100}
                placeholder="e.g. 5"
                value={marks ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setConfig({ marks: undefined });
                  } else {
                    const n = parseInt(val);
                    setConfig({ marks: isNaN(n) ? undefined : n });
                  }
                }}
                onBlur={() => {
                  if (marks !== undefined) {
                    setConfig({ marks: Math.min(100, Math.max(1, marks)) });
                  }
                }}
              />
            )}

            <Button
              onClick={() => generate()}
              loading={isPending}
              disabled={!canGenerate}
              icon={<HelpCircle className="h-4 w-4" />}
              className="w-full"
            >
              {isPending ? "Generating…" : "Generate Questions"}
            </Button>
            {!canGenerate && (
              <p className="text-xs text-muted-foreground">
                Select a class and subject
                {qType === "BRIEF" ? ", and set marks per question," : ""} to
                continue.
              </p>
            )}
          </div>
        </Card>

        {(result !== null || isPending) && (
          <div className="lg:col-span-2">
            <StreamingResultPanel
              error={error}
              isPending={isPending}
              result={result}
              canRetry={canGenerate}
              onRetry={() => generate()}
              Icon={HelpCircle}
              title="Generated Questions"
              pendingMessage="Generating your questions..."
              actions={
                <>
                  <Badge variant={difficultyBadge[difficulty]}>{difficulty}</Badge>
                  <Badge variant="info">{qType}</Badge>
                </>
              }
              filename={`questions-${qType}-${difficulty}.md`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
