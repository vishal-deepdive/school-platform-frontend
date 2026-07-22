import type { SelectOption } from "@/shared/types/common";

export const SESSION_OPTIONS: SelectOption[] = [
  "2025-26",
  "2026-27",
].map((s) => ({ value: s, label: s }));

/**
 * The current Indian academic session (April–March) derived from today's
 * date, e.g. "2026-27" any time from April 2026 through March 2027.
 *
 * Use this wherever a session filter/form needs a sensible default — never
 * hardcode a literal like "2025-26", it silently goes stale every April and
 * every page that hardcoded it ends up defaulting to last year's session.
 */
export function getCurrentSession(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? year : year - 1; // April = month index 3
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export const ENROLL_MODE_OPTIONS: SelectOption[] = [
  { value: "new", label: "New Batch" },
  { value: "single", label: "Single Student" },
  { value: "replace", label: "Batch with Replacement" },
  { value: "refresh", label: "Refresh Embeddings (Decay Blend)" },
];
