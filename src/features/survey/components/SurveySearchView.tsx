import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/auth";
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
import { Card } from "@/shared/components/ui/Card";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { Panel } from "@/shared/components/ui/Panel";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SkeletonText } from "@/shared/components/ui/Skeleton";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { Table } from "@/shared/components/ui/Table";
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
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [data, setData] = useState<SearchData | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "admin";

  useQuery({
    queryKey: ["survey", "status"],
    queryFn: () => surveyApi.getStatus(),
    staleTime: 5 * 60000,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<SurveySearchFormData>({
    resolver: zodResolver(surveySearchSchema),
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
    [queueToken, flushPending, selectedSourceIds],
  );

  const hasResult = intent !== null;
  const dataRows = data ? getDataRows(data) : [];
  const sampleSize = data ? getSampleSize(data) : null;
  const columns = buildTableColumns(dataRows);

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
            )
          }
        >
          <SheetSelector
            value={selectedSourceIds}
            onChange={setSelectedSourceIds}
            disabled={streaming}
            showSchoolName={isAdmin}
          />

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              {...register("query")}
              placeholder="e.g. How satisfied are students with teacher support in class 10?"
              disabled={streaming}
              className="w-full rounded-lg border border-input bg-background text-foreground pl-10 pr-4 py-2.5 text-sm transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 placeholder:text-muted-foreground/60"
            />
          </div>

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
        <Panel title="AI Insight" icon={<Bot className="h-4 w-4" />}>
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            Analyzing your data…
          </div>
          <SkeletonText lines={5} />
        </Panel>
      )}

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
              <SkeletonText lines={5} />
            ) : null}
          </Panel>

          {/* ── Interactive chart (Recharts) ──────────────────────── */}
          {chartData && (
            <Panel title="Visualization" icon={<BarChart2 className="h-4 w-4" />}>
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
