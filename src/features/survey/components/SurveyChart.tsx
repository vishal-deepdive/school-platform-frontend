import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts";
import type { ChartData } from "@/features/survey/types";

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(350, 70%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(45, 85%, 50%)",
  "hsl(120, 50%, 45%)",
];

function formatLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    if (!Number.isInteger(val)) return val.toFixed(1);
    return val.toLocaleString();
  }
  return String(val);
}

export function SurveyChart({ data }: { data: ChartData }) {
  const cleanData = useMemo(() => {
    return data.data.map((row) => {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        clean[k] = v === null || v === undefined ? 0 : v;
      }
      return clean;
    });
  }, [data.data]);

  if (data.type === "pie" && data.y_keys.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={cleanData}
            dataKey={data.y_keys[0]}
            nameKey={data.x_key}
            cx="50%"
            cy="50%"
            outerRadius={120}
            label={({ name, value }) => `${name}: ${formatValue(value)}`}
          >
            {cleanData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(val: unknown) => formatValue(val)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (data.type === "scatter" && data.y_keys.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey={data.x_key}
            name={formatLabel(data.x_key)}
            type="number"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            dataKey={data.y_keys[0]}
            name={formatLabel(data.y_keys[0])}
            type="number"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(val: unknown) => formatValue(val)}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Scatter data={cleanData} fill={COLORS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  const isHorizontal = data.type === "horizontal_bar";

  return (
    <ResponsiveContainer width="100%" height={Math.max(350, cleanData.length * 32)}>
      <BarChart
        data={cleanData}
        layout={isHorizontal ? "vertical" : "horizontal"}
        margin={{ top: 10, right: 30, bottom: 10, left: isHorizontal ? 100 : 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        {isHorizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              dataKey={data.x_key}
              type="category"
              width={90}
              tick={{ fontSize: 11 }}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={data.x_key}
              tick={{ fontSize: 11 }}
              angle={cleanData.length > 6 ? -35 : 0}
              textAnchor={cleanData.length > 6 ? "end" : "middle"}
              height={cleanData.length > 6 ? 70 : 30}
            />
            <YAxis tick={{ fontSize: 12 }} />
          </>
        )}
        <Tooltip formatter={(val: unknown) => formatValue(val)} />
        {data.y_keys.length > 1 && <Legend />}
        {data.y_keys.map((yKey, i) => (
          <Bar
            key={yKey}
            dataKey={yKey}
            name={formatLabel(yKey)}
            fill={COLORS[i % COLORS.length]}
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
