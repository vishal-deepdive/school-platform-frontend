import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Minus, TrendingUp } from "lucide-react";
import type { ChartData, ChartPalette, ChartValueFormat } from "@/features/survey/types";

// ── Palette ──────────────────────────────────────────────────────────────────
// Theme-aware where possible: the single-hue "primary" case rides the app's
// brand token so it tracks light/dark; sentiment/score/performance reuse the
// exact traffic-light + 1→5 ramps the dashboard already uses, so charts read
// consistently across the product. Categorical hues are a validated, CVD-aware
// set (assigned in fixed order, never cycled) for telling distinct series apart.
const PRIMARY = "oklch(var(--primary))";
const SENTIMENT = { pos: "#10b981", neu: "#f59e0b", neg: "#ef4444" };
const SCORE_RAMP = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981"]; // 1→5
const CATEGORICAL = ["#3987e5", "#199e70", "#eda100", "#9085e9", "#e66767", "#eb6834"];

const AXIS = "oklch(var(--muted-foreground))";
const GRID = "oklch(var(--border))";
const TRACK = "oklch(var(--muted))";

const NEG_TOKENS = [
  "strongly disagree", "disagree", "dissatisfied", "very poor", "poor", "poorly",
  "insufficient", "negative", "not satisfied", "detractor", "extremely dissatisfied",
];
const POS_TOKENS = [
  "strongly agree", "agree", "highly satisfied", "very satisfied", "satisfied",
  "excellent", "very good", "good", "very well", "well", "sufficient", "positive",
  "promoter",
];

/** Traffic-light colour for a "higher-is-better" percentage (satisfaction rate). */
function performanceColor(pct: number): string {
  if (pct >= 75) return SENTIMENT.pos;
  if (pct >= 50) return SENTIMENT.neu;
  return SENTIMENT.neg;
}

/** Classify a sentiment/Likert label → traffic-light bucket. Negatives are tested
 * first so "not satisfied" / "dissatisfied" never fall through to the positive set. */
function sentimentColor(label: string): string {
  const s = label.toLowerCase();
  if (NEG_TOKENS.some((k) => s.includes(k))) return SENTIMENT.neg;
  if (POS_TOKENS.some((k) => s.includes(k))) return SENTIMENT.pos;
  return SENTIMENT.neu;
}

// ── Formatting ───────────────────────────────────────────────────────────────

function formatValue(val: unknown, fmt: ChartValueFormat = "number"): string {
  if (val === null || val === undefined || val === "") return "—";
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return String(val);
  if (fmt === "percent") return `${Math.round(n * 10) / 10}%`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatTick(fmt: ChartValueFormat = "number") {
  return (val: number) =>
    fmt === "percent" ? `${val}%` : val.toLocaleString(undefined, { notation: "compact" });
}

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Styled tooltip ───────────────────────────────────────────────────────────

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  fmt,
  multi,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  fmt: ChartValueFormat;
  multi: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      {label !== undefined && label !== "" && (
        <p className="mb-1 text-xs font-semibold text-popover-foreground">{String(label)}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {multi && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            {multi && (
              <span className="text-muted-foreground">{humanize(String(entry.name ?? ""))}</span>
            )}
            <span className="ml-auto font-semibold tabular-nums text-popover-foreground">
              {formatValue(entry.value, fmt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const legendStyle = { fontSize: 12, color: "oklch(var(--muted-foreground))" };

// ── Key-takeaway strip ───────────────────────────────────────────────────────
// The single most "helpful" element: it states the point of the chart in words —
// the leader, the laggard, and the benchmark — so a busy reader gets the story
// without decoding bars. Computed from the same rows the chart draws.

type Tone = "good" | "bad" | "muted";
interface TakeawayItem {
  icon: ReactNode;
  label: string;
  value: string;
  tone: Tone;
}

const toneClass: Record<Tone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-red-600 dark:text-red-400",
  muted: "text-foreground",
};

function TakeawayStrip({ items }: { items: TakeawayItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((it, i) => (
        <div
          key={i}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5"
        >
          <span className={toneClass[it.tone]}>{it.icon}</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {it.label}
          </span>
          <span className={`text-xs font-semibold ${toneClass[it.tone]}`}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

function buildTakeaway(
  rows: Record<string, unknown>[],
  xKey: string,
  measure: string,
  fmt: ChartValueFormat,
  isDistribution: boolean,
): TakeawayItem[] {
  const pts = rows
    .map((r) => ({ label: String(r[xKey] ?? "—"), v: Number(r[measure]) }))
    .filter((p) => Number.isFinite(p.v));
  if (pts.length < 2) return [];

  const ic = "h-3.5 w-3.5";

  if (isDistribution) {
    const total = pts.reduce((a, p) => a + p.v, 0);
    const top = pts.reduce((a, b) => (b.v > a.v ? b : a));
    const share = total > 0 ? Math.round((top.v / total) * 100) : null;
    return [
      {
        icon: <TrendingUp className={ic} />,
        label: "Most common",
        value: `${top.label}${share != null ? ` · ${share}%` : ""}`,
        tone: "muted",
      },
      {
        icon: <Minus className={ic} />,
        label: "Responses",
        value: total.toLocaleString(),
        tone: "muted",
      },
    ];
  }

  const max = pts.reduce((a, b) => (b.v > a.v ? b : a));
  const min = pts.reduce((a, b) => (b.v < a.v ? b : a));
  const avg = pts.reduce((a, p) => a + p.v, 0) / pts.length;
  return [
    {
      icon: <ArrowUp className={ic} />,
      label: "Highest",
      value: `${max.label} · ${formatValue(max.v, fmt)}`,
      tone: "good",
    },
    {
      icon: <ArrowDown className={ic} />,
      label: "Lowest",
      value: `${min.label} · ${formatValue(min.v, fmt)}`,
      tone: "bad",
    },
    {
      icon: <Minus className={ic} />,
      label: "Average",
      value: formatValue(Math.round(avg * 10) / 10, fmt),
      tone: "muted",
    },
  ];
}

function average(rows: Record<string, unknown>[], measure: string): number | null {
  const vals = rows.map((r) => Number(r[measure])).filter((n) => Number.isFinite(n));
  if (vals.length < 3) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ── Chart ────────────────────────────────────────────────────────────────────

export function SurveyChart({ data }: { data: ChartData }) {
  const fmt: ChartValueFormat = data.value_format ?? "number";
  const palette: ChartPalette = data.palette ?? "primary";
  const measure = data.y_keys[0];

  const rows = useMemo(
    () =>
      data.data.map((row) => {
        const clean: Record<string, unknown> = { ...row };
        for (const k of data.y_keys) {
          const v = clean[k];
          clean[k] = v === null || v === undefined ? 0 : typeof v === "number" ? v : Number(v) || 0;
        }
        return clean;
      }),
    [data.data, data.y_keys],
  );

  // A percentage on a plain comparison is a "higher-is-better" rate → colour it by
  // performance (traffic light) instead of one flat hue, so weak areas jump out.
  const performanceColoring =
    palette === "primary" && fmt === "percent" && ["bar", "horizontal_bar"].includes(data.type);
  const isDistribution = palette === "sentiment" || palette === "score";

  const resolveColor = (row: Record<string, unknown>, index: number): string => {
    if (performanceColoring) return performanceColor(Number(row[measure]) || 0);
    switch (palette) {
      case "sentiment":
        return sentimentColor(String(row[data.x_key]));
      case "score": {
        const n = Number(row[data.x_key]);
        return Number.isFinite(n) ? SCORE_RAMP[Math.min(4, Math.max(0, Math.round(n) - 1))] : PRIMARY;
      }
      case "categorical":
        return CATEGORICAL[index % CATEGORICAL.length];
      default:
        return PRIMARY;
    }
  };

  if (rows.length === 0) return null;

  const percentDomain: [number, number] | undefined = fmt === "percent" ? [0, 100] : undefined;
  const avg = !isDistribution ? average(rows, measure) : null;

  let chart: ReactNode = null;
  let takeaway: TakeawayItem[] = [];

  // ── Line (trend over time) ─────────────────────────────────────────────────
  if (data.type === "line") {
    const pts = rows.map((r) => Number(r[measure])).filter((n) => Number.isFinite(n));
    if (pts.length >= 2) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      const delta = last - first;
      takeaway = [
        { icon: <Minus className="h-3.5 w-3.5" />, label: "Latest", value: formatValue(last, fmt), tone: "muted" },
        {
          icon: delta >= 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />,
          label: "Change",
          value: `${delta >= 0 ? "+" : ""}${formatValue(Math.round(delta * 10) / 10, fmt)}`,
          tone: delta >= 0 ? "good" : "bad",
        },
      ];
    }
    chart = (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={rows} margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" opacity={0.5} />
          <XAxis
            dataKey={data.x_key}
            tick={{ fontSize: 11, fill: AXIS }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            label={data.x_label ? { value: data.x_label, position: "insideBottom", offset: -12, fontSize: 12, fill: AXIS } : undefined}
          />
          <YAxis
            domain={percentDomain}
            tick={{ fontSize: 11, fill: AXIS }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={formatTick(fmt)}
          />
          <Tooltip content={<ChartTooltip fmt={fmt} multi={false} />} cursor={{ stroke: GRID }} />
          <Line
            type="monotone"
            dataKey={measure}
            name={data.y_label ?? humanize(measure)}
            stroke={PRIMARY}
            strokeWidth={2.5}
            dot={{ r: 3, fill: PRIMARY, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // ── Scatter (relationship between two measures) ────────────────────────────
  else if (data.type === "scatter") {
    chart = (
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 28, left: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" opacity={0.5} />
          <XAxis
            type="number"
            dataKey={data.x_key}
            name={data.x_label}
            tick={{ fontSize: 11, fill: AXIS }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            label={data.x_label ? { value: data.x_label, position: "insideBottom", offset: -14, fontSize: 12, fill: AXIS } : undefined}
          />
          <YAxis
            type="number"
            dataKey={measure}
            name={data.y_label}
            tick={{ fontSize: 11, fill: AXIS }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={formatTick(fmt)}
          />
          <Tooltip content={<ChartTooltip fmt={fmt} multi={false} />} cursor={{ strokeDasharray: "3 3", stroke: GRID }} />
          <Scatter data={rows} fill={PRIMARY} fillOpacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // ── Grouped bar (distinct series across a dimension) ───────────────────────
  else if (data.type === "grouped_bar") {
    const height = Math.max(320, rows.length * 56);
    chart = (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 16, right: 24, bottom: 24, left: 8 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" opacity={0.5} />
          <XAxis dataKey={data.x_key} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis
            domain={percentDomain}
            tick={{ fontSize: 11, fill: AXIS }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={formatTick(fmt)}
          />
          <Tooltip content={<ChartTooltip fmt={fmt} multi />} cursor={{ fill: AXIS, opacity: 0.06 }} />
          <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={9} />
          {data.y_keys.map((yKey, i) => (
            <Bar
              key={yKey}
              dataKey={yKey}
              name={humanize(yKey)}
              fill={CATEGORICAL[i % CATEGORICAL.length]}
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── Bar — horizontal (rankings, long labels) or vertical ───────────────────
  else {
    takeaway = buildTakeaway(rows, data.x_key, measure, fmt, isDistribution);
    const isHorizontal = data.type === "horizontal_bar";
    const longestLabel = Math.max(...rows.map((r) => String(r[data.x_key] ?? "").length), 0);
    const showTrack = fmt === "percent";

    if (isHorizontal) {
      const yWidth = Math.min(200, Math.max(70, longestLabel * 7));
      const height = Math.max(220, rows.length * 44 + 40);
      chart = (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 52, bottom: 8, left: 8 }}>
            <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" opacity={0.5} />
            <XAxis
              type="number"
              domain={percentDomain}
              tick={{ fontSize: 11, fill: AXIS }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatTick(fmt)}
            />
            <YAxis
              type="category"
              dataKey={data.x_key}
              width={yWidth}
              tick={{ fontSize: 11, fill: AXIS }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
            />
            <Tooltip content={<ChartTooltip fmt={fmt} multi={false} />} cursor={{ fill: AXIS, opacity: 0.06 }} />
            {avg != null && (
              <ReferenceLine
                x={avg}
                stroke={AXIS}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: `Avg ${formatValue(Math.round(avg * 10) / 10, fmt)}`, position: "top", fontSize: 10, fill: AXIS }}
              />
            )}
            <Bar
              dataKey={measure}
              name={data.y_label ?? humanize(measure)}
              radius={[0, 4, 4, 0]}
              maxBarSize={26}
              background={showTrack ? { fill: TRACK, radius: 4 } : undefined}
            >
              {rows.map((row, i) => (
                <Cell key={i} fill={resolveColor(row, i)} />
              ))}
              <LabelList
                dataKey={measure}
                position="right"
                formatter={(v: unknown) => formatValue(v, fmt)}
                style={{ fontSize: 11, fill: AXIS, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    } else {
      const manyOrLong = rows.length > 6 || longestLabel > 8;
      chart = (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={rows} margin={{ top: 24, right: 16, bottom: manyOrLong ? 56 : 24, left: 8 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" opacity={0.5} />
            <XAxis
              dataKey={data.x_key}
              tick={{ fontSize: 11, fill: AXIS }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval={0}
              angle={manyOrLong ? -30 : 0}
              textAnchor={manyOrLong ? "end" : "middle"}
              height={manyOrLong ? 60 : 30}
            />
            <YAxis
              domain={percentDomain}
              tick={{ fontSize: 11, fill: AXIS }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={formatTick(fmt)}
            />
            <Tooltip content={<ChartTooltip fmt={fmt} multi={false} />} cursor={{ fill: AXIS, opacity: 0.06 }} />
            {avg != null && !isDistribution && (
              <ReferenceLine
                y={avg}
                stroke={AXIS}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: `Avg ${formatValue(Math.round(avg * 10) / 10, fmt)}`, position: "right", fontSize: 10, fill: AXIS }}
              />
            )}
            <Bar dataKey={measure} name={data.y_label ?? humanize(measure)} radius={[4, 4, 0, 0]} maxBarSize={64}>
              {rows.map((row, i) => (
                <Cell key={i} fill={resolveColor(row, i)} />
              ))}
              <LabelList
                dataKey={measure}
                position="top"
                formatter={(v: unknown) => formatValue(v, fmt)}
                style={{ fontSize: 11, fill: AXIS, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
  }

  return (
    <div>
      <TakeawayStrip items={takeaway} />
      {chart}
    </div>
  );
}
