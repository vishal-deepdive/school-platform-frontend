/**
 * Text alignment between the parsed markdown and the original PDF.
 *
 * Both panes show the same words in different shapes: pdf.js splits a line into
 * arbitrary absolutely-positioned spans (often mid-word, and with ligature
 * glyphs like the single-codepoint "fi"), while the parser's markdown adds
 * syntax, re-joins hyphenated words, reflows tables and drops soft line breaks.
 * Comparing the raw strings therefore fails constantly, which is why a naive
 * matcher highlights the wrong paragraph — or nothing at all.
 *
 * So everything is compared in *compact* form: lower-case letters and digits
 * only, with every space, punctuation mark, ligature and diacritic folded away.
 * Each compact character remembers the exact DOM text node and UTF-16 offset it
 * came from, so a match maps straight back to a DOM `Range` — and a Range
 * yields glyph-exact, per-line rectangles for the highlight overlay.
 *
 * Everything here is synchronous and allocation-light: one index per rendered
 * page, built once, reused for every hover.
 */

export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ── Compact projection ──────────────────────────────────────────────────────

/** Glyphs a PDF may use for what markdown writes as plain letters. */
const FOLDED: Record<string, string> = {
  "ﬁ": "fi",
  "ﬂ": "fl",
  "ﬀ": "ff",
  "ﬃ": "ffi",
  "ﬄ": "ffl",
  "æ": "ae",
  "œ": "oe",
  "ß": "ss",
  "ø": "o",
  "đ": "d",
  "ł": "l",
};

const KEEP = /[a-z0-9]/;
const COMBINING = /[̀-ͯ]/g;

/**
 * Project one source character onto the compact alphabet. Returns "" for
 * whitespace and punctuation, and occasionally more than one character (a
 * ligature expands) — callers must map every produced character back to the
 * same source offset.
 */
export function foldChar(ch: string): string {
  const lower = ch.toLowerCase();
  const ligature = FOLDED[lower];
  if (ligature) return ligature;
  if (lower.length === 1 && KEEP.test(lower)) return lower;
  // Anything else non-ASCII may still be a letter wearing an accent.
  if (lower.charCodeAt(0) < 128) return "";
  let out = "";
  for (const c of lower.normalize("NFKD").replace(COMBINING, "")) {
    if (KEEP.test(c)) out += c;
  }
  return out;
}

/** Compact projection of a plain string (markdown syntax folds away for free). */
export function compact(text: string): string {
  let out = "";
  for (const ch of text) out += foldChar(ch);
  return out;
}

// ── DOM-backed index ────────────────────────────────────────────────────────

export interface CompactIndex {
  /** The compact projection of every text node under the indexed root. */
  text: string;
  nodes: Text[];
  /** For compact offset i: the index into `nodes` it came from. */
  nodeOf: Int32Array;
  /** For compact offset i: the UTF-16 offset inside that node. */
  offsetIn: Int32Array;
  /** Compact offset where node i starts; `nodes.length + 1` entries. */
  nodeStart: Int32Array;
  /** Reverse lookup for "where does this element sit in compact space". */
  nodeIndex: Map<Text, number>;
}

/** Never index more than this per page — a pathological parse cannot wedge the UI. */
const MAX_INDEX_CHARS = 120_000;

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS"]);

class IndexBuilder {
  private parts: string[] = [];
  private len = 0;
  private readonly nodes: Text[] = [];
  private readonly nodeStarts: number[] = [];
  private readonly nodeOf: number[] = [];
  private readonly offsetIn: number[] = [];

  get length() {
    return this.len;
  }

  add(node: Text) {
    const raw = node.data;
    if (!raw || this.len >= MAX_INDEX_CHARS) return;
    const idx = this.nodes.length;
    this.nodes.push(node);
    this.nodeStarts.push(this.len);

    let utf16 = 0;
    for (const ch of raw) {
      const folded = foldChar(ch);
      if (folded) {
        this.parts.push(folded);
        for (let k = 0; k < folded.length; k++) {
          this.nodeOf.push(idx);
          this.offsetIn.push(utf16);
        }
        this.len += folded.length;
      }
      utf16 += ch.length;
    }
  }

  build(): CompactIndex {
    const nodeIndex = new Map<Text, number>();
    this.nodes.forEach((n, i) => nodeIndex.set(n, i));
    return {
      text: this.parts.join(""),
      nodes: this.nodes,
      nodeOf: Int32Array.from(this.nodeOf),
      offsetIn: Int32Array.from(this.offsetIn),
      // Sentinel tail: node i spans [nodeStart[i], nodeStart[i + 1]).
      nodeStart: Int32Array.from([...this.nodeStarts, this.len]),
      nodeIndex,
    };
  }
}

function walkText(root: HTMLElement, visit: (node: Text) => void) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (SKIP_TAGS.has(el.tagName) || el.classList.contains("endOfContent")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    visit(node as Text);
    node = walker.nextNode();
  }
}

/** Index every text node under `root`, in document (reading) order. */
export function buildIndex(root: HTMLElement): CompactIndex {
  const builder = new IndexBuilder();
  walkText(root, (node) => builder.add(node));
  return builder.build();
}

// ── Markdown block index ────────────────────────────────────────────────────

export interface BlockSpan {
  el: HTMLElement;
  /** Compact range this block occupies inside the page index. */
  start: number;
  end: number;
}

export interface BlockIndex {
  index: CompactIndex;
  blocks: BlockSpan[];
}

/** Leaf-level prose units — the granularity a reader hovers at. */
const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6, li, tr, pre, blockquote";

/**
 * Index a rendered markdown page block by block, so a compact match can be
 * resolved back to the paragraph that produced it. Only *innermost* blocks are
 * kept (an `li` wrapping a `p` yields the `p`), which keeps them disjoint and
 * keeps the concatenated text in reading order.
 */
export function buildBlockIndex(root: HTMLElement): BlockIndex {
  const all = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  const leaves = all.filter((el) => !el.querySelector(BLOCK_SELECTOR));

  const builder = new IndexBuilder();
  const blocks: BlockSpan[] = [];
  for (const el of leaves) {
    const start = builder.length;
    walkText(el, (node) => builder.add(node));
    const end = builder.length;
    if (end > start) blocks.push({ el, start, end });
  }
  return { index: builder.build(), blocks };
}

/** The block a compact range mostly falls inside, by overlap. */
export function blockForRange(
  blocks: BlockSpan[],
  start: number,
  end: number,
): BlockSpan | null {
  let best: BlockSpan | null = null;
  let bestOverlap = 0;
  for (const block of blocks) {
    const overlap = Math.min(block.end, end) - Math.max(block.start, start);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = block;
    }
  }
  return bestOverlap > 0 ? best : null;
}

/** Compact range covered by an element's own text nodes, or null. */
export function rangeOfElement(
  index: CompactIndex,
  el: HTMLElement,
): { start: number; end: number } | null {
  let start = Infinity;
  let end = -Infinity;
  walkText(el, (node) => {
    const i = index.nodeIndex.get(node);
    if (i === undefined) return;
    start = Math.min(start, index.nodeStart[i]);
    end = Math.max(end, index.nodeStart[i + 1]);
  });
  return end > start ? { start, end } : null;
}

// ── Matching ────────────────────────────────────────────────────────────────

export interface MatchRange {
  start: number;
  end: number;
  /** Share of the needle that was actually found, 0–1. */
  score: number;
}

/**
 * Coverage below this is noise rather than a match — better to show no
 * highlight than to point at the wrong paragraph.
 */
export const MIN_MATCH_SCORE = 0.34;

/** Anchor size: long enough to be unique on a page, short enough to survive edits. */
const CHUNK = 16;
/** How far ahead of the previous anchor a later anchor may legitimately land. */
const MAX_GAP = 900;

/**
 * Locate `needle` inside `haystack`, tolerating the differences that survive
 * compaction — a word the parser inserted, a header the PDF repeats, a table
 * cell reordered.
 *
 * The needle is walked in fixed-size anchors; each anchor is searched forward
 * from the previous hit, so repeated boilerplate ("Class IX Physics") locks
 * onto the occurrence that continues the run rather than the first one on the
 * page. Anchors that do not appear are skipped and cost score, not position.
 *
 * `hint` biases the first anchor towards a known-nearby offset; matching still
 * falls back to the whole haystack when nothing is found after it.
 */
export function findBestMatch(haystack: string, needle: string, hint = 0): MatchRange | null {
  if (!haystack || !needle) return null;

  const from = Math.max(0, Math.min(hint, haystack.length - 1));

  // Verbatim hit — by far the common case for a clean parse.
  let at = from > 0 ? haystack.indexOf(needle, from) : -1;
  if (at < 0) at = haystack.indexOf(needle);
  if (at >= 0) return { start: at, end: at + needle.length, score: 1 };

  if (needle.length <= CHUNK) return null;

  let cursor = from;
  let start = -1;
  let end = -1;
  let matched = 0;
  let anchors = 0;

  for (let i = 0; i + CHUNK <= needle.length; i += CHUNK) {
    anchors++;
    const piece = needle.slice(i, i + CHUNK);
    let found = haystack.indexOf(piece, cursor);
    if (found < 0 && start < 0 && cursor > 0) found = haystack.indexOf(piece);
    if (found < 0) continue;
    if (start >= 0 && found > cursor + MAX_GAP) continue;

    if (start < 0) start = found;
    end = found + CHUNK;
    cursor = end;
    matched += CHUNK;
  }

  if (start < 0 || anchors === 0) return null;

  // The trailing remainder is shorter than an anchor; recover it so the
  // highlight does not stop a few characters short of the paragraph's end.
  if (needle.length % CHUNK !== 0) {
    const tail = needle.slice(-CHUNK);
    const tailAt = haystack.indexOf(tail, Math.max(start, end - CHUNK));
    if (tailAt >= 0 && tailAt <= end + MAX_GAP) end = Math.max(end, tailAt + CHUNK);
  }

  return { start, end, score: matched / (anchors * CHUNK) };
}

// ── Geometry ────────────────────────────────────────────────────────────────

/** Merge rectangles that sit on the same visual line into one box per line. */
export function mergeByLine(boxes: BoundingBox[], tolerance = 4): BoundingBox[] {
  if (boxes.length === 0) return [];
  const sorted = [...boxes].sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: BoundingBox[] = [];

  for (const box of sorted) {
    const line = lines[lines.length - 1];
    // Same line when the vertical centres are within a glyph's slack of each
    // other — pdf.js positions sub- and superscripts a few pixels off-baseline.
    if (line && Math.abs(line.top + line.height / 2 - (box.top + box.height / 2)) <= tolerance) {
      const left = Math.min(line.left, box.left);
      const top = Math.min(line.top, box.top);
      line.width = Math.max(line.left + line.width, box.left + box.width) - left;
      line.height = Math.max(line.top + line.height, box.top + box.height) - top;
      line.left = left;
      line.top = top;
    } else {
      lines.push({ ...box });
    }
  }
  return lines;
}

/** Hard cap so a whole-page match cannot spray hundreds of overlay nodes. */
const MAX_BOXES = 64;

/**
 * Turn a compact range into per-line boxes in `container`'s coordinate space.
 * Uses `Range.getClientRects()`, so the boxes follow the real glyph geometry —
 * including pdf.js's per-span horizontal scaling.
 */
export function boxesForRange(
  index: CompactIndex,
  start: number,
  end: number,
  container: HTMLElement,
): BoundingBox[] {
  const lo = Math.max(0, Math.min(start, index.nodeOf.length - 1));
  const hi = Math.max(lo + 1, Math.min(end, index.nodeOf.length));
  if (index.nodes.length === 0 || hi <= lo) return [];

  const range = document.createRange();
  try {
    range.setStart(index.nodes[index.nodeOf[lo]], index.offsetIn[lo]);
    // `hi - 1` is the last character inside the match; +1 covers the whole
    // source character even when it expanded into several compact ones.
    const lastNode = index.nodes[index.nodeOf[hi - 1]];
    range.setEnd(lastNode, Math.min(lastNode.data.length, index.offsetIn[hi - 1] + 1));
  } catch {
    return [];
  }

  const origin = container.getBoundingClientRect();
  const raw: BoundingBox[] = [];
  const rects = range.getClientRects();
  for (let i = 0; i < rects.length && raw.length < MAX_BOXES * 4; i++) {
    const r = rects[i];
    if (r.width < 1.5 || r.height < 1.5) continue;
    raw.push({
      top: r.top - origin.top,
      left: r.left - origin.left,
      width: r.width,
      height: r.height,
    });
  }
  return mergeByLine(raw).slice(0, MAX_BOXES);
}

/** Union of a set of boxes — what the auto-scroll needs to reveal. */
export function unionBox(boxes: BoundingBox[]): BoundingBox | null {
  if (boxes.length === 0) return null;
  let top = Infinity;
  let left = Infinity;
  let bottom = -Infinity;
  let right = -Infinity;
  for (const b of boxes) {
    top = Math.min(top, b.top);
    left = Math.min(left, b.left);
    bottom = Math.max(bottom, b.top + b.height);
    right = Math.max(right, b.left + b.width);
  }
  return { top, left, width: right - left, height: bottom - top };
}
