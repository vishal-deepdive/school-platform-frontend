/**
 * Colour vocabulary shared by the survey analytics charts. Kept out of
 * `analytics.tsx` so that file exports only components (fast refresh).
 */

/** Traffic light for a "higher is better" percentage. Matches SurveyChart. */
export function pctColor(pct: number): string {
  if (pct >= 75) return "#10b981"; // emerald-500
  if (pct >= 50) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

/** 1 → 5 ramp for recommendation scores. */
export const SCORE_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981"];
