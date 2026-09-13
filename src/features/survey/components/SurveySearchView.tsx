import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
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
  Download,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import {
  surveySearchSchema,
  type SurveySearchFormData,
} from "@/features/survey/schema";
import { surveyApi, surveyKeys } from "@/features/survey/api/survey";
import { useStreamBatcher } from "@/features/rag/hooks/useStreamBatcher";
import { useStreamAbort, isAbortError } from "@/shared/hooks/useStreamAbort";
import { downloadBlob, getErrorMessage, jsonToCsv } from "@/shared/lib/utils";
import { Card } from "@/shared/components/ui/Card";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { Panel } from "@/shared/components/ui/Panel";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { Textarea } from "@/shared/components/ui/Textarea";
import { StatLine } from "@/shared/components/ui/StatLine";
import { Table, type Column } from "@/shared/components/ui/Table";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { SurveyChart } from "./SurveyChart";
import { SheetSelector } from "./SheetSelector";
import type {
  SearchIntent,
  SearchData,
  ChartData,
} from "@/features/survey/types";

// ── Constants ───────────────────────────────────────────────────────────────

const intentConfig: Record<
  SearchIntent,
  { color: "info" | "success" | "purple"; label: string }
> = {
  QUANT: { color: "info", label: "Quantitative" },
  QUAL: { color: "success", label: "Qualitative" },
  MIXED: { color: "purple", label: "Mixed Analysis" },
};

const URL_DEFAULTS: { q: string } = { q: "" };

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

function humanizeHeader(key: string): string {
  return key
    .replace(/_(pct|percent|percentage)\b/gi, " %")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PERCENT_HINT = /(percent|pct|share|proportion|_rate\b|ratio)/i;

function isNumeric(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val);
}

/** Build professional, type-aware table columns: numeric columns are right-aligned
 * with tabular figures + locale/percent formatting and are sortable; text columns
 * sort alphabetically and truncate gracefully. Header labels are humanized. */
function buildTableColumns(rows: Record<string, unknown>[]): Column<Record<string, unknown>>[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    // Sample the column to decide alignment/formatting from actual values.
    const sample = rows.find((r) => r[key] !== null && r[key] !== undefined)?.[key];
    const numeric = isNumeric(sample);
    const percent = numeric && PERCENT_HINT.test(key);

    return {
      key,
      header: humanizeHeader(key),
      align: numeric ? "right" : "left",
      sortValue: (row: Record<string, unknown>) => {
        const v = row[key];
        if (v === null || v === undefined) return null;
        return isNumeric(v) ? v : String(v);
      },
      render: (row: Record<string, unknown>) => {
        const val = row[key];
        if (val === null || val === undefined || val === "") return "—";
        if (isNumeric(val)) {
          if (percent) return `${Math.round(val * 10) / 10}%`;
          if (key.includes("similarity") || key.includes("score"))
            return val.toFixed(2);
          return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(1);
        }
        const s = String(val);
        return s.length > 90 ? s.slice(0, 87) + "…" : s;
      },
    };
  });
}

/** Three bouncing dots — the "the model is working" tell, used while streaming. */
function ThinkingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      {label}
    </div>
  );
}

// ── Collapsible result section ──────────────────────────────────────────────

function ResultSection({
  title,
  icon,
  badge,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  /** Sits BESIDE the toggle, never inside it — a button within a button is
   *  invalid markup and the inner click would also toggle the section. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const contentId = `${title.replace(/\s+/g, "-").toLowerCase()}-panel`;
  return (
    <Card padding="none">
      <div className="flex items-center gap-2 pr-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex flex-1 items-center justify-between gap-2 rounded-xl px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
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
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {open && (
        <div id={contentId} className="border-t border-border/50">
          {children}
        </div>
      )}
    </Card>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function SurveySearchView() {
  const [streaming, setStreaming] = useState(false);
  const [insight, setInsight] = useState("");
  const [intent, setIntent] = useState<SearchIntent | null>(null);
  const [chartUrl, setChartUrl] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [data, setData] = useState<SearchData | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const { begin, stop, end } = useStreamAbort();
  // Synchronous guard against overlapping runs — mirrors QAPage/NotesPage/
  // QuestionsPage/LessonPlanPage. The `streaming` state updates a render
  // behind, so two near-simultaneous submits (fast double-Enter) could both
  // pass a state-only check, each starting a stream and racing to flip
  // `streaming` back to false in their own `finally` — the second run's
  // completion could get masked as "not streaming" while the first is still
  // actually generating.
  const streamingRef = useRef(false);

  const { isAdmin, schoolId, schoolParam, ready: adminReady } = useActiveSchool();

  // Reset selected sheets whenever the active school changes so stale source IDs
  // from the previous school are never sent with the new school's queries.
  useEffect(() => {
    setSelectedSourceIds([]);
  }, [schoolId, schoolParam.school_name]);

  useQuery({
    queryKey: surveyKeys.status(schoolId),
    queryFn: () => surveyApi.getStatus(schoolParam.school_name),
    staleTime: 5 * 60000,
  });

  // The asked question lives in the URL, so a refresh or a shared link brings
  // it back. It is deliberately NOT re-run on load — an analysis costs an LLM
  // call, so the reader presses Analyze.
  const [urlState, updateUrl] = useUrlState(URL_DEFAULTS);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<SurveySearchFormData>({
    resolver: zodResolver(surveySearchSchema),
    defaultValues: { query: urlState.q },
  });

  const appendInsight = useCallback(
    (chunk: string) => setInsight((prev) => prev + chunk),
    [],
  );
  const { push: queueToken, flush: flushPending } =
    useStreamBatcher(appendInsight);

  const handleCopy = useCallback(() => {
    if (!insight) return;
    navigator.clipboard
      .writeText(insight)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("Couldn't copy to clipboard."));
  }, [insight]);

  const handleCopySql = useCallback(() => {
    if (!sqlQuery) return;
    navigator.clipboard
      .writeText(sqlQuery)
      .then(() => {
        setSqlCopied(true);
        setTimeout(() => setSqlCopied(false), 1500);
      })
      .catch(() => toast.error("Couldn't copy to clipboard."));
  }, [sqlQuery]);

  const runSearch = useCallback(
    async (formData: SurveySearchFormData) => {
      if (streamingRef.current) return;
      streamingRef.current = true;
      updateUrl({ q: formData.query }, { push: true });

      const controller = begin();

      setStreaming(true);
      setInsight("");
      setIntent(null);
      setChartUrl(null);
      setChartData(null);
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
            // Empty selection = "All sheets" → omit the filter entirely so the
            // backend searches every accessible row (including legacy rows that
            // predate sheet-sources and have a NULL source_id).
            source_ids: selectedSourceIds.length ? selectedSourceIds : undefined,
            school_name: isAdmin ? schoolParam.school_name : undefined,
          },
          controller.signal,
        )) {
          if (event.type === "meta") {
            setIntent(event.intent);
            setChartUrl(event.chart_url ?? null);
            setChartData(event.chart_data ?? null);
            setData(event.data);
            setSqlQuery(event.sql_query ?? null);
          } else if (event.type === "token") {
            queueToken(event.content);
          } else if (event.type === "done") {
            flushPending();
          } else if (event.type === "error") {
            flushPending();
            setError(event.message);
            toast.error(event.message);
          }
        }
      } catch (err) {
        flushPending();
        if (!isAbortError(err)) {
          const msg = getErrorMessage(err);
          setError(msg);
          toast.error(msg);
        }
      } finally {
        flushPending();
        setStreaming(false);
        streamingRef.current = false;
        end(controller);
      }
    },
    [
      begin,
      end,
      queueToken,
      flushPending,
      selectedSourceIds,
      isAdmin,
      schoolParam.school_name,
      updateUrl,
    ],
  );

  const hasResult = intent !== null;
  const dataRows = data ? getDataRows(data) : [];
  const sampleSize = data ? getSampleSize(data) : null;
  const columns = buildTableColumns(dataRows);

  /** The analysed rows were previously view-only — no way to take them into a
   *  staff meeting or a spreadsheet. Exports exactly what the table shows. */
  const handleExportCsv = () => {
    if (dataRows.length === 0) return;
    const keys = Object.keys(dataRows[0]);
    const csv = jsonToCsv(
      dataRows,
      keys.map((key) => ({
        header: humanizeHeader(key),
        getValue: (row: Record<string, unknown>) => {
          const v = row[key];
          return v === null || v === undefined ? "" : String(v);
        },
      })),
    );
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `feedback-${stamp}.csv`);
    toast.success(`Exported ${dataRows.length} row${dataRows.length === 1 ? "" : "s"}`);
  };

  return (
    <div className="space-y-6">
      {/* ── Query controls ────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(runSearch)}>
        <FilterBar
          hideHeader
          actions={
            streaming ? (
              <Button
                type="button"
                variant="outline"
                icon={<StopCircle className="h-4 w-4" />}
                onClick={stop}
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
            )
          }
        >
          <SheetSelector
            value={selectedSourceIds}
            onChange={setSelectedSourceIds}
            disabled={streaming}
            schoolId={schoolId}
            showSchoolName={isAdmin}
            schoolName={isAdmin ? schoolParam.school_name : undefined}
          />

          <div className="grid gap-1.5">
            <Textarea
              {...register("query")}
              aria-label="Ask a question about student feedback"
              placeholder="e.g. How satisfied are students with teacher support in class 10, and how does that compare with last term?"
              disabled={streaming}
              rows={2}
              // These questions run long; Enter would submit a half-written one,
              // so the shortcut is the same ⌘/Ctrl+Enter the Q&A composer uses.
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleSubmit(runSearch)();
                }
              }}
              className="min-h-[4.5rem]"
            />
            <p className="text-[11px] text-muted-foreground">
              <kbd className="rounded border border-border/60 px-1 py-px font-sans">
                ⌘/Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-border/60 px-1 py-px font-sans">
                Enter
              </kbd>{" "}
              to analyse
            </p>
          </div>

          {/* Starter prompts are onboarding scaffolding — once there is a result
              on screen they are just clutter above it. */}
          {!hasResult && !streaming && (
            <div className="flex flex-wrap gap-1.5">
              {exampleQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={!adminReady}
                  onClick={() => setValue("query", q)}
                  className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </FilterBar>
      </form>

      {/* ── Error banner (shown even when no meta/result arrived) ─── */}
      {error && !streaming && (
        <Alert variant="error" title="Analysis failed">
          {error}
        </Alert>
      )}

      {/* ── Pre-query hint ────────────────────────────────────────── */}
      {!hasResult && !error && !streaming && (
        <EmptyState
          icon={<Sparkles className="h-12 w-12" />}
          title="Ask a question to get started"
          description="Pose any question about student feedback in natural language. The AI analyzes your data and returns an insight, a chart and the underlying rows."
        />
      )}

      {/* ── Analyzing skeleton (query sent, nothing returned yet) ─── */}
      {streaming && !hasResult && (
        <Panel title="AI insight" icon={<Bot className="h-4 w-4" />}>
          <ThinkingDots label="Analysing your data…" />
        </Panel>
      )}

      {/* ── Results ───────────────────────────────────────────────── */}
      {hasResult && (
        <div className="space-y-4">
          {/* What the analysis covered */}
          <div className="flex flex-wrap items-center gap-3">
            {intent && (
              <Badge variant={intentConfig[intent].color}>
                {intentConfig[intent].label}
              </Badge>
            )}
            <StatLine
              items={[
                {
                  value: sampleSize ?? 0,
                  label: sampleSize === 1 ? "response analysed" : "responses analysed",
                  icon: <Users />,
                  hidden: sampleSize === null || sampleSize <= 0,
                },
                {
                  value: dataRows.length,
                  label: dataRows.length === 1 ? "row returned" : "rows returned",
                  hidden: dataRows.length === 0,
                },
              ]}
            />
          </div>

          {/* ── Insight card (streamed narrative) ─────────────────── */}
          <Panel
            title="AI Insight"
            icon={<Bot className="h-4 w-4" />}
            actions={
              insight && !streaming ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  icon={
                    copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : undefined
            }
          >
            {insight ? (
              <MarkdownRenderer
                content={insight}
                streaming={streaming}
                className="text-sm"
              />
            ) : streaming ? (
              <ThinkingDots label="Writing the insight…" />
            ) : null}
          </Panel>

          {/* ── Interactive chart (Recharts) ──────────────────────── */}
          {chartData && (
            <Panel
              title={chartData.title || "Visualization"}
              icon={<BarChart2 className="h-4 w-4" />}
            >
              <SurveyChart data={chartData} />
            </Panel>
          )}

          {/* ── PNG chart fallback ────────────────────────────────── */}
          {!chartData && chartUrl && (
            <Panel title="Visualization" icon={<BarChart2 className="h-4 w-4" />}>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 flex items-center justify-center">
                <img
                  src={resolveChartSrc(chartUrl)}
                  alt="Survey visualization"
                  className="max-w-full max-h-[400px] rounded-md object-contain"
                  loading="lazy"
                />
              </div>
            </Panel>
          )}

          {/* ── Raw data (collapsible) ────────────────────────────── */}
          {dataRows.length > 0 && (
            <ResultSection
              title="Data"
              icon={<Database className="h-4 w-4 text-muted-foreground" />}
              badge={`${dataRows.length} rows`}
              open={showData}
              onToggle={() => setShowData((v) => !v)}
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleExportCsv}
                  icon={<Download className="h-3.5 w-3.5" />}
                >
                  CSV
                </Button>
              }
            >
              <Table columns={columns} data={dataRows} stickyHeader />
            </ResultSection>
          )}

          {/* ── SQL (collapsible, admin only) ─────────────────────── */}
          {sqlQuery && (
            <ResultSection
              title="Generated SQL"
              icon={<Code className="h-4 w-4 text-muted-foreground" />}
              open={showSql}
              onToggle={() => setShowSql((v) => !v)}
            >
              <div className="p-4">
                <div className="relative rounded-lg border border-border/60 bg-muted/40">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
                  >
                    {sqlCopied ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                  <pre className="overflow-x-auto rounded-lg px-4 py-3.5 pr-16 text-xs leading-relaxed text-foreground/90">
                    <code className="font-mono">{sqlQuery}</code>
                  </pre>
                </div>
              </div>
            </ResultSection>
          )}

          {/* ── Empty state ───────────────────────────────────────── */}
          {!streaming && dataRows.length === 0 && !insight && !error && (
            <EmptyState
              icon={<SearchX className="h-12 w-12" />}
              title="No matching data found"
              description="Try rephrasing your question or asking about a different topic."
            />
          )}
        </div>
      )}
    </div>
  );
}
