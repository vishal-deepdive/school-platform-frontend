import type { SelectOption } from "@/shared/types/common";

export const SESSION_OPTIONS: SelectOption[] = [
  "2023-24",
  "2024-25",
  "2025-26",
  "2026-27",
].map((s) => ({ value: s, label: s }));

export const ENROLL_MODE_OPTIONS: SelectOption[] = [
  { value: "new", label: "New Batch" },
  { value: "single", label: "Single Student" },
  { value: "replace", label: "Batch with Replacement" },
  { value: "refresh", label: "Refresh Embeddings (Decay Blend)" },
];
