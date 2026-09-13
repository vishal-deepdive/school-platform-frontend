import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { SCORE_COLORS, pctColor } from "@/features/survey/components/analyticsTokens";
import type {
  SurveyClassStat,
  SurveyDimensionStat,
  SurveyDimensionTrend,
  SurveyRecommendation,
  SurveySubjectStat,
} from "@/features/survey/types";

/**
 * Shared chart vocabulary for student-feedback analytics. Both the Feedback
 * Insights module page and the compact dashboard section render from here, so a
 * change to how satisfaction is coloured or suppressed can't apply to one and
 * not the other.
 */

const AXIS_TICK = { fontSize: 11, fill: "oklch(var(--muted-foreground))" };
const GRID_STROKE = "oklch(var(--border))";
const CURSOR = { fill: "oklch(var(--muted-foreground))", opacity: 0.08 };

// ── Trend delta ──────────────────────────────────────────────────────────────

/** "+4pts vs last term" / "flat" / "-3pts" for a cycle-over-cycle change. */
export function TrendDelta({
  delta,
  suffix = "pts",
  title,
}: {
  delta: number | null | undefined;
  suffix?: string;
  title?: string;
}) {
  if (delta === null || delta === undefined) return null;
  if (delta === 0) {
    return (
      <span
        title={title}
        className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground"
      >
        <Minus className="h-3 w-3" /> flat
      </span>
    );
  }
  const positive = delta > 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        positive
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-red-700 dark:text-red-400",
      )}
    >
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {delta}
      {suffix}
    </span>
  );
}

// ── Tooltips ─────────────────────────────────────────────────────────────────

interface TipRow {
  name: string;
  value: string;
}

function Tip({ title, rows }: { title: string; rows: TipRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">{title}</p>
      <div className="mt-1 space-y-0.5">
        {rows.map((r) => (
          <p key={r.name} className="text-muted-foreground">
            {r.name}: <span className="font-medium text-popover-foreground">{r.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

// ── Empty / suppressed states ────────────────────────────────────────────────

function ChartNote({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Footnote for slices withheld because the cohort is too small to anonymise. */
export function SuppressedNote({
  count,
  noun,
  names,
}: {
  count: number;
  noun: string;
  names?: string[];
}) {
  if (count <= 0) return null;
  const subject = names?.length ? names.join(", ") : `${count} ${noun}${count === 1 ? "" : "es"}`;
  return (
    <p className="mt-3 text-[11px] text-muted-foreground">
      {subject} {count === 1 ? "has" : "have"} too few responses to show safely.
    </p>
  );
}

// ── Horizontal % bar chart ───────────────────────────────────────────────────

export interface RatedRow {
  label: string;
  /** 0–100. */
  pct: number;
  /** Sample size behind the percentage. */
  count?: number;
  /** Cycle-over-cycle change in points. */
  delta?: number | null;
}

/**
 * Satisfaction as a real charted magnitude: a fixed 0–100 axis, so a 40% bar
 * looks like 40% of the way to "everyone is happy" rather than 40% of whatever
 * the best row happens to be. Bars carry the traffic-light colour and their own
 * value label, which keeps the y-axis to category names only.
 */
export function RatedBarChart({
  rows,
  height,
  emptyLabel = "No rated responses yet.",
}: {
  rows: RatedRow[];
  /** Defaults to a height that fits every row without cramping. */
  height?: number;
  emptyLabel?: string;
}) {
  if (rows.length === 0) return <ChartNote>{emptyLabel}</ChartNote>;
  const h = height ?? Math.max(140, rows.length * 34 + 24);

  return (
    <div style={{ height: h }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
          barCategoryGap="22%"
        >
          <CartesianGrid
            horizontal={false}
            strokeDasharray="3 3"
            stroke={GRID_STROKE}
            opacity={0.6}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={116}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
          />
          <Tooltip
            cursor={CURSOR}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as RatedRow;
              return (
                <Tip
                  title={row.label}
                  rows={[
                    { name: "Positive", value: `${row.pct}%` },
                    ...(row.count !== undefined
                      ? [{ name: "Responses", value: row.count.toLocaleString() }]
                      : []),
                    ...(row.delta != null
                      ? [
                          {
                            name: "vs previous",
                            value: `${row.delta > 0 ? "+" : ""}${row.delta}pts`,
                          },
                        ]
                      : []),
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={22} animationDuration={250}>
            {rows.map((r) => (
              <Cell key={r.label} fill={pctColor(r.pct)} />
            ))}
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v: number) => `${v}%`}
              style={{ fontSize: 11, fontWeight: 600, fill: "oklch(var(--foreground))" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Satisfaction by topic, with each area's cycle-over-cycle delta in the tooltip. */
export function SatisfactionByArea({
  dimensions,
  trendByKey,
}: {
  dimensions: SurveyDimensionStat[];
  trendByKey?: Map<string, SurveyDimensionTrend>;
}) {
  return (
    <RatedBarChart
      rows={dimensions.map((d) => ({
        label: d.label,
        pct: d.positive_pct ?? 0,
        count: d.total,
        delta: trendByKey?.get(d.key)?.delta_pct ?? null,
      }))}
    />
  );
}

/** Satisfaction by class. */
export function SatisfactionByClass({ classes }: { classes: SurveyClassStat[] }) {
  return (
    <RatedBarChart
      rows={classes.map((c) => ({
        label: `Class ${c.class_name}`,
        pct: c.positive_pct ?? 0,
        count: c.count,
      }))}
      emptyLabel="No class data yet."
    />
  );
}

// ── Counts ───────────────────────────────────────────────────────────────────

/**
 * A plain count comparison (subjects students name as hardest). Counts have no
 * natural ceiling, so this scales to the largest row rather than to 100.
 */
export function CountBarChart({
  rows,
  unit = "responses",
  height,
  emptyLabel = "No responses yet.",
}: {
  rows: { label: string; count: number }[];
  unit?: string;
  height?: number;
  emptyLabel?: string;
}) {
  if (rows.length === 0) return <ChartNote>{emptyLabel}</ChartNote>;
  const h = height ?? Math.max(140, rows.length * 34 + 24);

  return (
    <div style={{ height: h }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
          barCategoryGap="22%"
        >
          <CartesianGrid
            horizontal={false}
            strokeDasharray="3 3"
            stroke={GRID_STROKE}
            opacity={0.6}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={116}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
          />
          <Tooltip
            cursor={CURSOR}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as { label: string; count: number };
              return (
                <Tip
                  title={row.label}
                  rows={[{ name: unit, value: row.count.toLocaleString() }]}
                />
              );
            }}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            fill="oklch(var(--primary))"
            animationDuration={250}
          >
            <LabelList
              dataKey="count"
              position="right"
              style={{ fontSize: 11, fontWeight: 600, fill: "oklch(var(--foreground))" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ToughestSubjects({ subjects }: { subjects: SurveySubjectStat[] }) {
  return (
    <CountBarChart
      rows={subjects.map((s) => ({ label: s.subject, count: s.count }))}
      unit="Mentions"
    />
  );
}

// ── Recommendation distribution ──────────────────────────────────────────────

/** The 1–5 "would you recommend" spread — a genuine distribution, so vertical. */
export function RecommendationSpread({
  recommendation,
  height = 176,
}: {
  recommendation: SurveyRecommendation;
  height?: number;
}) {
  if (recommendation.suppressed)
    return <ChartNote>Too few responses to show safely.</ChartNote>;
  if (recommendation.responses === 0) return <ChartNote>No scores yet.</ChartNote>;

  const total = recommendation.distribution.reduce((sum, d) => sum + d.count, 0);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={recommendation.distribution}
          margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke={GRID_STROKE}
            opacity={0.6}
          />
          <XAxis dataKey="score" tickLine={false} axisLine={false} tick={AXIS_TICK} />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={28}
            tick={AXIS_TICK}
          />
          <Tooltip
            cursor={CURSOR}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { score: number; count: number };
              const share = total > 0 ? Math.round((p.count / total) * 100) : 0;
              return (
                <Tip
                  title={`Score ${p.score} / 5`}
                  rows={[
                    {
                      name: "Responses",
                      value: `${p.count.toLocaleString()} (${share}%)`,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={250}>
            {recommendation.distribution.map((d) => (
              <Cell key={d.score} fill={SCORE_COLORS[d.score - 1] ?? "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
