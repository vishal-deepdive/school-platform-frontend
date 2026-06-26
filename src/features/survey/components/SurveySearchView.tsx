import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Search,
  BarChart2,
  Sparkles,
  SearchX,
  ChevronDown,
  ChevronUp,
  Database,
  Code,
  Copy,
  Check,
  Bot,
  StopCircle,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  surveySearchSchema,
  type SurveySearchFormData,
} from "@/features/survey/schema";
import { surveyApi } from "@/features/survey/api/survey";
import { useStreamBatcher } from "@/features/rag/hooks/useStreamBatcher";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { Table } from "@/shared/components/ui/Table";
import type {
  SearchIntent,
  SearchData,
  FeedbackColumn,
} from "@/features/survey/types";
import type { SelectOption } from "@/shared/types/common";

// ── Constants ───────────────────────────────────────────────────────────────

const feedbackOptions: SelectOption[] = [
  { value: "teacher_feedback", label: "Teacher Feedback" },
  { value: "school_feedback", label: "School Feedback" },
  { value: "school_suggestions", label: "School Suggestions" },
];

const limitOptions: SelectOption[] = [5, 10, 20, 50].map((n) => ({
  value: String(n),
  label: `${n} results`,
}));

const intentConfig: Record<
  SearchIntent,
  { color: "info" | "success" | "purple"; label: string; icon: string }
> = {
  QUANT: { color: "info", label: "Quantitative", icon: "📊" },
  QUAL: { color: "success", label: "Qualitative", icon: "💬" },
  MIXED: { color: "purple", label: "Mixed Analysis", icon: "🔄" },
};

const exampleQueries = [
  "How satisfied are students with teacher support?",
  "What are the main complaints about school facilities?",
  "Compare transport satisfaction across classes",
  "Which subjects do students find most difficult?",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function resolveChartSrc(chartUrl: string): string {
  return surveyApi.resolveChartUrl(chartUrl);
}

function getDataRows(data: SearchData): Record<string, unknown>[] {
  if (data.results) return data.results;
  if (data.quantitative?.results)
    return data.quantitative.results as Record<string, unknown>[];
  if (data.qualitative?.results)
    return data.qualitative.results as Record<string, unknown>[];
  return [];
}

function getSampleSize(data: SearchData): number | null {
  if (data.sample_size) return data.sample_size;
  if (data.quantitative?.sample_size) return data.quantitative.sample_size;
  if (data.count) return data.count;
  if (data.qualitative?.count) return data.qualitative.count;
  return null;
}

function buildTableColumns(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]).map((key) => ({
    key,
    header: key.replace(/_/g, " "),
    render: (row: Record<string, unknown>) => {
      const val = row[key];
      if (val === null || val === undefined) return "—";
      if (typeof val === "number") {
        if (key.includes("score") || key.includes("similarity"))
          return (val as number).toFixed(2);
        if (!Number.isInteger(val)) return (val as number).toFixed(1);
      }
      const s = String(val);
      if (s.length > 80) return s.slice(0, 77) + "…";
      return s;
    },
  }));
}

// ── Collapsible section ─────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card padding="none">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors rounded-xl"
      >
        <span className="flex items-center gap-2.5">
          {icon}
          {title}
          {badge && (
            <Badge variant="default" className="ml-1">
              {badge}
            </Badge>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="border-t border-border/50">{children}</div>}
    </Card>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function SurveySearchView() {
  const [streaming, setStreaming] = useState(false);
  const [insight, setInsight] = useState("");
  const [intent, setIntent] = useState<SearchIntent | null>(null);
  const [chartUrl, setChartUrl] = useState<string | null>(null);
  const [data, setData] = useState<SearchData | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { data: surveyStatus } = useQuery({
    queryKey: ["survey", "status"],
    queryFn: () => surveyApi.getStatus(),
    staleTime: 5 * 60_000,
  });

  const classOptions: SelectOption[] = (surveyStatus?.by_class ?? [])
    .map((c) => {
      const cls = c as Record<string, unknown>;
      const name = String(cls.class ?? cls.class_name ?? "").trim();
      return { value: name, label: name };
    })
    .filter((opt) => opt.value.length > 0);
  const noClasses = classOptions.length === 0;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<SurveySearchFormData>({
    resolver: zodResolver(surveySearchSchema),
    defaultValues: {
      class_name: "",
      feedback_column: "school_feedback",
      limit: 10,
    },
  });

  const appendInsight = useCallback(
    (chunk: string) => setInsight((prev) => prev + chunk),
    [],
  );
  const { push: queueToken, flush: flushPending } =
    useStreamBatcher(appendInsight);

  const handleCopy = useCallback(() => {
    if (!insight) return;
    navigator.clipboard.writeText(insight).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [insight]);

  const runSearch = useCallback(
    async (formData: SurveySearchFormData) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStreaming(true);
      setInsight("");
      setIntent(null);
      setChartUrl(null);
      setData(null);
      setSqlQuery(null);
      setError(null);
      setShowData(false);
      setShowSql(false);
      setCopied(false);

      try {
        for await (const event of surveyApi.searchStream(
          {
            query: formData.query,
            class_name: formData.class_name,
            feedback_column: formData.feedback_column as FeedbackColumn,
            limit: formData.limit,
          },
          controller.signal,
        )) {
          if (event.type === "meta") {
            setIntent(event.intent);
            setChartUrl(event.chart_url ?? null);
            setData(event.data);
            setSqlQuery(event.sql_query ?? null);
          } else if (event.type === "token") {
            queueToken(event.content);
          } else if (event.type === "done") {
            flushPending();
          } else if (event.type === "error") {
            flushPending();
            setError(event.message);
          }
        }
      } catch (err) {
        flushPending();
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          const msg = getErrorMessage(err);
          setError(msg);
          toast.error(msg);
        }
      } finally {
        flushPending();
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [queueToken, flushPending],
  );

  const feedbackCol = watch("feedback_column");
  const hasResult = intent !== null;
  const dataRows = data ? getDataRows(data) : [];
  const sampleSize = data ? getSampleSize(data) : null;
  const columns = buildTableColumns(dataRows);

  return (
    <div className="space-y-6">
      {/* ── Search form ───────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="AI Survey Copilot"
          description="Ask questions about student feedback in natural language. The AI analyzes your data and provides actionable insights."
        />

        <form onSubmit={handleSubmit(runSearch)} className="space-y-4">
          {/* Query input */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Your question
            </label>
            <div className="relative">
              <input
                {...register("query")}
                placeholder="e.g. How satisfied are students with teacher support in class 10?"
                disabled={streaming}
                className="w-full rounded-lg border border-border bg-background text-foreground pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 placeholder:text-muted-foreground/60"
              />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Class"
              options={classOptions}
              placeholder={noClasses ? "No data yet" : "Select class…"}
              hint={
                noClasses
                  ? "Import survey data first."
                  : undefined
              }
              disabled={noClasses || streaming}
              {...register("class_name")}
            />
            <Select
              label="Feedback type"
              options={feedbackOptions}
              value={feedbackCol}
              disabled={streaming}
              {...register("feedback_column")}
            />
            <Select
              label="Max results"
              options={limitOptions}
              disabled={streaming}
              {...register("limit", { valueAsNumber: true })}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {exampleQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={streaming}
                  onClick={() => setValue("query", q)}
                  className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  {q}
                </button>
              ))}
            </div>
            {streaming ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<StopCircle className="h-4 w-4" />}
                onClick={() => abortRef.current?.abort()}
              >
                Stop
              </Button>
            ) : (
              <Button
                type="submit"
                loading={isSubmitting}
                icon={<Sparkles className="h-4 w-4" />}
              >
                Analyze
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* ── Results ───────────────────────────────────────────────── */}
      {hasResult && (
        <div className="space-y-4">
          {/* Status bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {intent && (
              <Badge variant={intentConfig[intent].color}>
                {intentConfig[intent].label}
              </Badge>
            )}
            {sampleSize !== null && (
              <Badge variant="default">
                <Users className="h-3 w-3 mr-1" />
                {sampleSize.toLocaleString()} responses
              </Badge>
            )}
            {streaming && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground animate-fade-in">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Generating insight…
              </span>
            )}
          </div>

          {/* ── Insight card (streamed narrative) ─────────────────── */}
          <Card className="relative group">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                AI Insight
              </h3>
            </div>

            {insight ? (
              <MarkdownRenderer
                content={insight}
                streaming={streaming}
                className="text-sm"
              />
            ) : streaming ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                Analyzing your data…
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            {/* Copy button */}
            {insight && !streaming && (
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-5 right-5 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </Card>

          {/* ── Chart ─────────────────────────────────────────────── */}
          {chartUrl && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Visualization
                </h3>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 flex items-center justify-center">
                <img
                  src={resolveChartSrc(chartUrl)}
                  alt="Survey visualization"
                  className="max-w-full max-h-[400px] rounded-md object-contain"
                  loading="lazy"
                />
              </div>
            </Card>
          )}

          {/* ── Raw data (collapsible) ────────────────────────────── */}
          {dataRows.length > 0 && (
            <CollapsibleSection
              title="Data"
              icon={<Database className="h-4 w-4 text-muted-foreground" />}
              badge={`${dataRows.length} rows`}
              open={showData}
              onToggle={() => setShowData((v) => !v)}
            >
              <Table columns={columns} data={dataRows} />
            </CollapsibleSection>
          )}

          {/* ── SQL (collapsible, admin only) ─────────────────────── */}
          {sqlQuery && (
            <CollapsibleSection
              title="Generated SQL"
              icon={<Code className="h-4 w-4 text-muted-foreground" />}
              open={showSql}
              onToggle={() => setShowSql((v) => !v)}
            >
              <pre className="overflow-x-auto bg-gray-950 px-5 py-4 text-xs leading-relaxed text-green-400 font-mono">
                {sqlQuery}
              </pre>
            </CollapsibleSection>
          )}

          {/* ── Empty state ───────────────────────────────────────── */}
          {!streaming && dataRows.length === 0 && !insight && (
            <EmptyState
              icon={<SearchX className="h-12 w-12" />}
              title="No matching data found"
              description="Try a different class, feedback type, or rephrase your question."
            />
          )}
        </div>
      )}
    </div>
  );
}
