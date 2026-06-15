import type { RagMetadata } from "@/features/rag/types";

/**
 * Cascade helpers that derive dependent dropdown options from the single
 * `/metadata` hierarchy fetch — no extra round-trips.
 *
 *   hierarchy[class].subjects                 → subjects in that class
 *   hierarchy[class][subject].chapters        → chapters in that subject
 */

export function subjectsForClass(
  meta: RagMetadata | undefined,
  cls?: string,
): string[] {
  if (!meta || !cls) return [];
  return meta.hierarchy?.[cls]?.subjects ?? [];
}

export function chaptersForClassSubject(
  meta: RagMetadata | undefined,
  cls?: string,
  subject?: string,
): string[] {
  if (!meta || !cls || !subject) return [];
  const subjectNode = meta.hierarchy?.[cls]?.[subject];
  // `subjects` (string[]) shares the index signature; only a real subject node
  // (non-array object) carries chapters.
  if (!subjectNode || Array.isArray(subjectNode)) return [];
  return subjectNode.chapters ?? [];
}
