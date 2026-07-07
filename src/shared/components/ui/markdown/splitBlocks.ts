/**
 * Splits Markdown into top-level blocks so a streaming renderer can memoise the
 * stable prefix and only re-parse (and re-run KaTeX/Prism over) the one block
 * that is still growing.
 *
 * Correctness rule: a block boundary is a blank line, EXCEPT where a blank line
 * legitimately lives inside a single construct —
 *   • fenced code blocks (``` / ~~~) — blank lines are code,
 *   • display math ($$ … $$ spanning lines) — blank lines are math,
 *   • "loose" lists (blank lines between items / multi-paragraph items).
 * The splitter is deliberately conservative: when unsure it keeps content
 * merged. Over-merging only makes the tail block a little larger (a perf
 * nit); under-merging would break a list or a code block (a correctness bug).
 *
 * The invariant the caller relies on: appending characters (as tokens stream
 * in) never changes an already-emitted earlier block — only the final block
 * grows or a new final block begins. That holds because streaming only appends,
 * and none of the "keep merged" conditions look backwards past the current
 * block's own start.
 */

const FENCE_RE = /^(\s{0,3})(`{3,}|~{3,})/;
const LIST_ITEM_RE = /^\s{0,3}(?:[-*+]|\d{1,9}[.)])(?:\s|$)/;
const INDENTED_RE = /^(?: {2,}|\t)/;

/** Count of `$$` occurrences on a line — used to toggle display-math state. */
function countDisplayDelims(line: string): number {
  let n = 0;
  let i = line.indexOf("$$");
  while (i !== -1) {
    n++;
    i = line.indexOf("$$", i + 2);
  }
  return n;
}

export function splitBlocks(markdown: string): string[] {
  const lines = markdown.split("\n");
  const blocks: string[] = [];

  let current: string[] = []; // lines accumulated for the block in progress
  let inFence = false;
  let fenceMarker = ""; // the exact ``` / ~~~ run that opened the current fence
  let inDisplayMath = false;
  let currentIsList = false; // did this block open as a list?

  const flush = () => {
    if (current.length) {
      blocks.push(current.join("\n"));
      current = [];
    }
    currentIsList = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Fenced code: swallow everything until the matching closing fence.
    if (inFence) {
      current.push(line);
      const m = FENCE_RE.exec(line);
      if (m && line.trim().startsWith(fenceMarker[0]) && m[2].length >= fenceMarker.length) {
        inFence = false;
        fenceMarker = "";
      }
      continue;
    }
    const fenceOpen = FENCE_RE.exec(line);
    if (fenceOpen) {
      if (current.length === 0) currentIsList = false;
      current.push(line);
      inFence = true;
      fenceMarker = fenceOpen[2];
      continue;
    }

    // ── Display math: $$ on a line with an odd delimiter count toggles state.
    if (countDisplayDelims(line) % 2 === 1) {
      inDisplayMath = !inDisplayMath;
    }
    if (inDisplayMath) {
      current.push(line);
      continue;
    }

    // ── Blank line: a candidate block boundary.
    if (line.trim() === "") {
      // Peek at the next non-blank line to decide whether this blank actually
      // ends the block, or merely separates items inside a loose list.
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      const next = j < lines.length ? lines[j] : undefined;

      const nextContinuesList =
        currentIsList &&
        next !== undefined &&
        (LIST_ITEM_RE.test(next) || INDENTED_RE.test(next));

      if (next === undefined) {
        // Only trailing blanks remain (common mid-stream). Drop them so the
        // current block stays byte-identical once real content follows on the
        // next flush — that keeps its memo entry stable instead of re-rendering
        // when the trailing "\n\n" turns into a real block boundary.
        continue;
      }
      if (nextContinuesList) {
        current.push(line);
        continue;
      }
      flush();
      continue;
    }

    // ── Ordinary content line.
    if (current.length === 0) {
      currentIsList = LIST_ITEM_RE.test(line);
    }
    current.push(line);
  }

  flush();
  return blocks.filter((b) => b.trim() !== "");
}
