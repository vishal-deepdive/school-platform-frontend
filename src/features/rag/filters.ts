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

export function titlesForClassSubjectChapter(
  meta: RagMetadata | undefined,
  cls?: string,
  subject?: string,
  chapter?: string,
): string[] {
  if (!meta || !cls || !subject || !chapter) return [];
  const subjectNode = meta.hierarchy?.[cls]?.[subject];
  if (!subjectNode || Array.isArray(subjectNode)) return [];
  const chapterNode = subjectNode[chapter];
  // Only a real chapter node (non-array object) carries titles; the fixed
  // `chapters` (string[]) key shares the same index signature.
  if (!chapterNode || Array.isArray(chapterNode)) return [];
  return chapterNode.titles ?? [];
}
