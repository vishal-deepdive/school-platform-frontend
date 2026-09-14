/**
 * Utilities for bidirectional text matching and bounding box calculations
 * between PDF text spans and Markdown content blocks (similar to LlamaParse).
 */

export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface HoverState {
  source: "markdown" | "pdf" | null;
  page: number;
  text?: string;
  blockId?: string;
  rect?: BoundingBox;
}

/** Normalize text for fuzzy matching by removing punctuation and excess whitespace. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split text into unique significant keywords (minimum 3 characters, non-trivial). */
export function extractKeywords(text: string, minLength = 3): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const words = normalized.split(" ");
  const stopWords = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "any", "can",
    "had", "her", "was", "one", "our", "out", "day", "get", "has", "him",
    "his", "how", "man", "new", "now", "old", "see", "two", "way", "who",
    "boy", "did", "its", "let", "put", "say", "she", "too", "use", "with",
    "this", "that", "from", "they", "will", "have", "more", "then", "them",
    "some", "into", "than", "page", "section"
  ]);

  const unique = new Set<string>();
  for (const w of words) {
    if (w.length >= minLength && !stopWords.has(w)) {
      unique.add(w);
    }
  }
  return Array.from(unique);
}

/**
 * Calculate overlap score (0 to 1) between query text and target text based on
 * token intersection and substring inclusion.
 */
export function computeTextSimilarity(query: string, target: string): number {
  const normQuery = normalizeText(query);
  const normTarget = normalizeText(target);

  if (!normQuery || !normTarget) return 0;
  if (normTarget.includes(normQuery) || normQuery.includes(normTarget)) {
    return 1.0;
  }

  const queryWords = extractKeywords(normQuery, 3);
  const targetWords = new Set(extractKeywords(normTarget, 3));
  if (queryWords.length === 0 || targetWords.size === 0) {
    return 0;
  }

  let matches = 0;
  for (const qw of queryWords) {
    if (targetWords.has(qw)) {
      matches++;
    }
  }

  return matches / queryWords.length;
}

/**
 * Find the Markdown block element on a page that best matches a snippet of PDF text.
 */
export function findBestMatchingMarkdownBlock(
  pageElement: HTMLElement,
  pdfText: string,
): HTMLElement | null {
  if (!pdfText.trim()) return null;
  const blocks = pageElement.querySelectorAll<HTMLElement>("[data-block-id]");
  if (blocks.length === 0) return null;

  let bestElement: HTMLElement | null = null;
  let bestScore = 0.2; // threshold for a meaningful match

  blocks.forEach((el) => {
    const text = el.textContent || "";
    const score = computeTextSimilarity(pdfText, text);
    if (score > bestScore) {
      bestScore = score;
      bestElement = el;
    }
  });

  return bestElement;
}

/**
 * Compute the union bounding box of matched elements or spans relative to a parent container.
 */
export function getUnionBoundingBox(
  elements: HTMLElement[],
  container: HTMLElement,
): BoundingBox | null {
  if (elements.length === 0) return null;

  const containerRect = container.getBoundingClientRect();
  let minTop = Infinity;
  let minLeft = Infinity;
  let maxBottom = -Infinity;
  let maxRight = -Infinity;

  let valid = false;
  for (const el of elements) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    valid = true;
    const top = r.top - containerRect.top + container.scrollTop;
    const left = r.left - containerRect.left + container.scrollLeft;
    const bottom = top + r.height;
    const right = left + r.width;

    if (top < minTop) minTop = top;
    if (left < minLeft) minLeft = left;
    if (bottom > maxBottom) maxBottom = bottom;
    if (right > maxRight) maxRight = right;
  }

  if (!valid) return null;

  return {
    top: Math.max(0, minTop),
    left: Math.max(0, minLeft),
    width: Math.max(10, maxRight - minLeft),
    height: Math.max(10, maxBottom - minTop),
  };
}
