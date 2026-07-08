import { useEffect, useState } from "react";
import { Sparkles, ArrowLeft, CheckCircle2, ClipboardList, Rocket, Target } from "lucide-react";
import toast from "@/shared/lib/toast";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import { Input } from "@/shared/components/ui/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { useGeneratePractice, useCreateAssignment } from "@/features/rag/hooks/useRag";
import { getErrorMessage, cn } from "@/shared/lib/utils";
import type {
  AssignmentScoring,
  AssignmentSummary,
  Difficulty,
  QuizQuestion,
  RagFilters,
} from "@/features/rag/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const DIFFICULTY_OPTIONS = [
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
];
const COUNT_OPTIONS = [5, 10, 15, 20].map((n) => ({ value: String(n), label: `${n} questions` }));
const ATTEMPT_OPTIONS = [
  { value: "1", label: "1 attempt" },
  { value: "2", label: "2 attempts" },
  { value: "3", label: "3 attempts" },
  { value: "5", label: "5 attempts" },
  { value: "unlimited", label: "Unlimited" },
];
const SCORING_OPTIONS = [
  { value: "last", label: "Keep last score" },
  { value: "best", label: "Keep best score" },
];
const TIME_LIMIT_OPTIONS = [
  { value: "0", label: "No time limit" },
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "20", label: "20 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
];
const LATE_OPTIONS = [
  { value: "no", label: "Close at due date" },
  { value: "yes", label: "Accept late (flagged)" },
];

interface PracticeBuilderModalProps {
  open: boolean;
  onClose: () => void;
  mode: "assignment" | "self_quiz";
  onCreated: (assignment: AssignmentSummary) => void;
  /** Pre-seed the chapter selection (e.g. weak-topic remediation from results). */
  initialFilters?: RagFilters;
  /** Pre-seed a sub-topic focus for generation. */
  initialTopic?: string;
}

/**
 * Two-step builder: configure & generate a structured MCQ set, then either
 * assign it to a class (teacher) or start it as a self-quiz (student).
 */
export function PracticeBuilderModal({
  open,
  onClose,
  mode,
  onCreated,
  initialFilters,
  initialTopic,
}: PracticeBuilderModalProps) {
  const [filters, setFilters] = useState<RagFilters>({});
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [numQuestions, setNumQuestions] = useState(10);
  const [topic, setTopic] = useState<string | undefined>(undefined);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  // Assignment policy (teacher only).
  const [attempts, setAttempts] = useState("1");
  const [scoring, setScoring] = useState<AssignmentScoring>("last");
  const [timeLimitMin, setTimeLimitMin] = useState("0");
  const [allowLate, setAllowLate] = useState("no");

  const { mutate: generate, isPending: isGenerating } = useGeneratePractice();
  const { mutate: create, isPending: isCreating } = useCreateAssignment();

  const canGenerate = !!filters.class_level && !!filters.subject;

  // Seed from the caller's prefill each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setFilters(initialFilters ?? {});
    setDifficulty("Medium");
    setNumQuestions(10);
    setTopic(initialTopic || undefined);
    setQuestions(null);
    setTitle("");
    setDueDate("");
    setAttempts("1");
    setScoring("last");
    setTimeLimitMin("0");
    setAllowLate("no");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => onClose();

  const defaultTitle = () => {
    const chapter = filters.chapter_name?.[0];
    const base = [filters.subject, topic || chapter].filter(Boolean).join(" — ");
    return base || `${filters.subject ?? "Practice"} quiz`;
  };

  const handleGenerate = () => {
    generate(
      { filters, difficulty, num_questions: numQuestions, topic },
      {
        onSuccess: (res) => {
          setQuestions(res.questions);
          setTitle(defaultTitle());
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const handleCreate = () => {
    if (!questions) return;
    const isAssignment = mode === "assignment";
    create(
      {
        title: title.trim() || defaultTitle(),
        kind: mode,
        class_level: filters.class_level,
        subject: filters.subject,
        chapter_name: filters.chapter_name?.[0],
        difficulty,
        questions,
        filters,
        // Interpret the picked date as end-of-day in the user's local timezone,
        // then send a tz-aware UTC instant so it doesn't drift a day on TIMESTAMPTZ.
        due_at:
          isAssignment && dueDate
            ? new Date(`${dueDate}T23:59:59`).toISOString()
            : null,
        attempts_allowed:
          isAssignment && attempts !== "unlimited" ? Number(attempts) : null,
        scoring: isAssignment ? scoring : undefined,
        allow_late: isAssignment ? allowLate === "yes" : undefined,
        time_limit_seconds:
          Number(timeLimitMin) > 0 ? Number(timeLimitMin) * 60 : null,
      },
      {
        onSuccess: (assignment) => {
          toast.success(mode === "assignment" ? "Assignment published!" : "Quiz ready — good luck!");
          onCreated(assignment);
          close();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const isAssign = mode === "assignment";
  const reviewing = questions !== null;

  const footer = reviewing ? (
    <>
      <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setQuestions(null)}>
        Back
      </Button>
      <Button
        icon={isAssign ? <ClipboardList className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
        loading={isCreating}
        onClick={handleCreate}
      >
        {isAssign ? "Assign to class" : "Start quiz"}
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={close}>
        Cancel
      </Button>
      <Button
        icon={<Sparkles className="h-4 w-4" />}
        loading={isGenerating}
        disabled={!canGenerate}
        onClick={handleGenerate}
      >
        Generate questions
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title={isAssign ? "New assignment" : "New self-quiz"}
      description={
        reviewing
          ? `${questions?.length ?? 0} questions ready`
          : "Pick a chapter and we'll generate auto-graded MCQs from the textbook."
      }
      icon={isAssign ? <ClipboardList className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      size="2xl"
      footer={footer}
    >
      {!reviewing ? (
        <div className="space-y-4">
          {topic && (
            <Alert variant="info">
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-4 w-4" />
                Focusing questions on <span className="font-medium">{topic}</span>.
              </span>
            </Alert>
          )}
          <RagFilterPanel
            filters={filters}
            onChange={setFilters}
            showTitle
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-start"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-start">
            <Select
              label="Difficulty"
              options={DIFFICULTY_OPTIONS}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            />
            <Select
              label="Number of questions"
              options={COUNT_OPTIONS}
              value={String(numQuestions)}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
            />
          </div>
          {!canGenerate && (
            <p className="text-xs text-muted-foreground">
              Select at least a class and subject. Choosing a chapter gives sharper questions.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {isAssign && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-start">
                <Input
                  label="Assignment title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chapter 3 practice"
                />
                <Input
                  label="Due date (optional)"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-start">
                <Select
                  label="Attempts allowed"
                  options={ATTEMPT_OPTIONS}
                  value={attempts}
                  onChange={(e) => setAttempts(e.target.value)}
                />
                <Select
                  label="Scoring"
                  options={SCORING_OPTIONS}
                  value={scoring}
                  onChange={(e) => setScoring(e.target.value as AssignmentScoring)}
                  disabled={attempts === "1"}
                  hint={attempts === "1" ? "Single attempt" : undefined}
                />
                <Select
                  label="Time limit"
                  options={TIME_LIMIT_OPTIONS}
                  value={timeLimitMin}
                  onChange={(e) => setTimeLimitMin(e.target.value)}
                />
                <Select
                  label="After due date"
                  options={LATE_OPTIONS}
                  value={allowLate}
                  onChange={(e) => setAllowLate(e.target.value)}
                  disabled={!dueDate}
                  hint={!dueDate ? "Set a due date" : undefined}
                />
              </div>
            </>
          )}

          {!isAssign && Number(timeLimitMin) >= 0 && (
            <Select
              label="Time limit (optional)"
              options={TIME_LIMIT_OPTIONS}
              value={timeLimitMin}
              onChange={(e) => setTimeLimitMin(e.target.value)}
            />
          )}

          <Alert variant="info">
            {isAssign
              ? "Review the questions below, then assign. Students see the questions without the answer key."
              : "Review your quiz below. Answers are hidden until you submit."}
          </Alert>

          <ul className="space-y-3">
            {questions?.map((q, qi) => (
              <li key={q.id} className="rounded-lg border border-border bg-card p-4">
                <p className="mb-2 text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">Q{qi + 1}. </span>
                  {q.question}
                </p>
                <ul className="space-y-1">
                  {q.options.map((opt, oi) => {
                    const isCorrect = oi === q.answer_index;
                    return (
                      <li
                        key={oi}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
                          isCorrect
                            ? "bg-green-500/10 font-medium text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        <span className="font-semibold tabular-nums">{LETTERS[oi]}.</span>
                        <span className="flex-1">{opt}</span>
                        {isCorrect && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                        )}
                      </li>
                    );
                  })}
                </ul>
                {q.topic && (
                  <div className="mt-2">
                    <Badge variant="default">{q.topic}</Badge>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
