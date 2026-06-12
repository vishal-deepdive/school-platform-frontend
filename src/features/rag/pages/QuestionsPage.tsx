import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HelpCircle, Download } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { ragApi } from "@/features/rag/api/rag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { getErrorMessage, downloadFile } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import type {
  QuestionType,
  Difficulty,
  RagFilters,
} from "@/features/rag/types";
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
  const [filters, setFilters] = useState<RagFilters>({});
  const [qType, setQType] = useState<QuestionType>("MCQ");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [numQuestions, setNumQuestions] = useState(10);
  const [marks, setMarks] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<string | null>(null);

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () =>
      ragApi.generateQuestions({
        filters,
        q_type: qType,
        difficulty,
        num_questions: numQuestions,
        ...(marks != null && { marks }),
      }),
    onSuccess: (data) => {
      setResult(data.content);
      toast.success(`${numQuestions} question(s) generated!`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const canGenerate =
    !!filters.class_level &&
    !!filters.subject &&
    (qType !== "BRIEF" || marks != null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Questions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create exam-ready MCQ or short-answer questions from textbook content.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Configuration" />

          <RagFilterPanel filters={filters} onChange={setFilters} />

          <div className="mt-4 space-y-4">
            <Select
              label="Question Type"
              options={qTypeOptions}
              value={qType}
              onChange={(e) => setQType(e.target.value as QuestionType)}
            />
            <Select
              label="Difficulty"
              options={difficultyOptions}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            />
            <Input
              label="Number of Questions"
              type="number"
              min={1}
              max={25}
              value={numQuestions}
              onChange={(e) => {
                const n = parseInt(e.target.value) || 1;
                setNumQuestions(Math.min(25, Math.max(1, n)));
              }}
              hint="Up to 25 per batch"
            />
            {qType === "BRIEF" && (
              <Input
                label="Marks per Question"
                type="number"
                min={1}
                max={100}
                placeholder="e.g. 5"
                value={marks ?? ""}
                onChange={(e) =>
                  setMarks(
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
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
              <p className="text-xs text-gray-400">
                Select a class and subject
                {qType === "BRIEF" ? ", and set marks per question," : ""} to
                continue.
              </p>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2">
          {result ? (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">
                    Generated Questions
                  </h3>
                  <Badge variant={difficultyBadge[difficulty]}>
                    {difficulty}
                  </Badge>
                  <Badge variant="info">{qType}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() =>
                    downloadFile(result, `questions-${qType}-${difficulty}.md`)
                  }
                >
                  Download
                </Button>
              </div>
              <div className="prose prose-sm max-w-none overflow-y-auto max-h-[65vh] rounded-lg bg-gray-50 p-4">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </Card>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
              <HelpCircle className="h-12 w-12 text-gray-300" />
              <div>
                <p className="font-semibold text-gray-500">
                  No questions generated yet
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Configure your settings and click Generate.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
