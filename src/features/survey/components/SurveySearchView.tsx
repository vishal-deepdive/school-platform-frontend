import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/auth";
import { authApi } from "@/features/auth/api/auth";
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
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { Table } from "@/shared/components/ui/Table";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { SurveyChart } from "./SurveyChart";
import { SheetSelector } from "./SheetSelector";
import type {
  SearchIntent,
  SearchData,
  ChartData,
  SourceItem,
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
  const [availableSheetIds, setAvailableSheetIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  // Re-seed the selection with every sheet whenever the underlying sheet SET
  // changes (initial load, or admin switching school), so the default is always
  // "All sheets" checked. A background refetch that returns the same set leaves
  // the user's own choices untouched.
  const seededKeyRef = useRef<string>("");

  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "admin";

  // ── Admin school scoping ──────────────────────────────────────────────────
  // Admins search one school at a time and may only pick sheets within it.
  const [adminSchool, setAdminSchool] = useState("");
  const { data: schoolsData, isLoading: isLoadingSchools } = useQuery({
    queryKey: ["schools", "list"],
    queryFn: () => authApi.searchSchools(""),
    enabled: isAdmin,
  });
  const schoolOptions = useMemo(
    () =>
      (schoolsData ?? []).map((s) => ({
        label: s.name,
        value: s.name,
        sublabel: [s.address, s.city, s.state, s.pin_code]
          .filter(Boolean)
          .join(", "),
      })),
    [schoolsData],
  );
  // The school scope sent to the backend / used to list sheets. Non-admins are
  // always locked to their own school (undefined → backend uses own school).
  const schoolParam = isAdmin ? adminSchool.trim() || undefined : undefined;
  const adminReady = !isAdmin || !!schoolParam;

  // Switching school drops the previous school's selection; it re-seeds to "all"
  // once the new school's sheets load.
  useEffect(() => {
    seededKeyRef.current = "";
    setSelectedSourceIds([]);
    setAvailableSheetIds([]);
  }, [schoolParam]);

  const handleSheetsLoaded = useCallback((sheets: SourceItem[]) => {
    const ids = sheets.map((s) => s.id);
    setAvailableSheetIds(ids);
    const key = [...ids].sort().join(",");
    if (key !== seededKeyRef.current) {
      seededKeyRef.current = key;
      setSelectedSourceIds(ids); // default: all sheets selected
    }
  }, []);

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
      // Admins must pick a school before searching.
      if (isAdmin && !schoolParam) {
        toast.error("Please select a school to search.");
        return;
      }
      // A sheet must be picked before searching. Selecting nothing (vs. "All
      // sheets", which ticks every box) is ambiguous, so we block it up front.
      if (selectedSourceIds.length === 0) {
        toast.error("Please select at least one sheet to search.");
        return;
      }

      // "All sheets" (every available box ticked) sends NO per-sheet filter, so
      // the search covers the whole school scope — including any legacy rows not
      // yet attributed to a sheet. A partial selection sends explicit ids.
      const allSelected =
        availableSheetIds.length > 0 &&
        availableSheetIds.every((id) => selectedSourceIds.includes(id));

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
            school_name: schoolParam,
            // "All sheets" → omit the filter (search everything in scope);
            // otherwise pin the explicit selection.
            source_ids: allSelected ? undefined : selectedSourceIds,
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
    [
      queueToken,
      flushPending,
      selectedSourceIds,
      availableSheetIds,
      isAdmin,
      schoolParam,
    ],
  );

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
          description="Ask any question about student feedback in natural language. The AI analyzes your data and provides actionable insights."
        />

        <form onSubmit={handleSubmit(runSearch)} className="space-y-4">
          {isAdmin && (
            <SearchableSelect
              label="School"
              placeholder="Select a school..."
              searchPlaceholder="Search schools..."
              options={schoolOptions}
              isLoading={isLoadingSchools}
              value={adminSchool}
              onChange={setAdminSchool}
              disabled={streaming}
            />
          )}

          {adminReady ? (
            <SheetSelector
              value={selectedSourceIds}
              onChange={setSelectedSourceIds}
              disabled={streaming}
              schoolName={schoolParam}
              showSchoolName={false}
              onSheetsLoaded={handleSheetsLoaded}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a school above to choose its sheets and search.
            </p>
          )}

          <div className="relative">
            <input
              {...register("query")}
              placeholder="e.g. How satisfied are students with teacher support in class 10?"
              disabled={streaming || !adminReady}
              className="w-full rounded-lg border border-border bg-background text-foreground pl-10 pr-28 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 placeholder:text-muted-foreground/60"
            />
            <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
            <div className="absolute right-2 top-2.5 flex items-center gap-2">
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
                  size="sm"
                  loading={isSubmitting}
                  disabled={!adminReady}
                  icon={<Sparkles className="h-4 w-4" />}
                >
                  Analyze
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {exampleQueries.map((q) => (
              <button
                key={q}
                type="button"
                disabled={streaming || !adminReady}
                onClick={() => setValue("query", q)}
                className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {q}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {/* ── Error banner (shown even when no meta/result arrived) ─── */}
      {error && !streaming && (
        <Card className="border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-2.5">
            <SearchX className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-destructive">
                Analysis failed
              </h3>
              <p className="text-sm text-destructive/90 mt-0.5">{error}</p>
            </div>
          </div>
        </Card>
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

          {/* ── Interactive chart (Recharts) ──────────────────────── */}
          {chartData && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Visualization
                </h3>
              </div>
              <SurveyChart data={chartData} />
            </Card>
          )}

          {/* ── PNG chart fallback ────────────────────────────────── */}
          {!chartData && chartUrl && (
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
