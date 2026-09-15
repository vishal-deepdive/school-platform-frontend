import { describe, expect, it } from "vitest";
import {
  blockForRange,
  compact,
  findBestMatch,
  mergeByLine,
  unionBox,
  MIN_MATCH_SCORE,
  type BlockSpan,
} from "./textAlign";

describe("compact", () => {
  it("keeps only letters and digits, lower-cased", () => {
    expect(compact("Hello, World! Section 1.2: Gravity.")).toBe("helloworldsection12gravity");
  });

  it("folds the ligatures and accents a PDF font emits", () => {
    // The PDF writes a single fi-ligature codepoint where markdown writes "fi".
    expect(compact("deﬁne")).toBe(compact("define"));
    expect(compact("café")).toBe("cafe");
    expect(compact("naïve")).toBe("naive");
  });

  it("erases the differences between a PDF line break and markdown", () => {
    // pdf.js hands back a hyphenated split across two spans; the parser rejoins.
    expect(compact("inter-\nnational")).toBe(compact("international"));
    // Markdown syntax disappears with the punctuation.
    expect(compact("**Newton's** second *law*")).toBe(compact("Newtons second law"));
  });
});

describe("findBestMatch", () => {
  const page = compact(
    "CHAPTER THREE. MOTION IN A STRAIGHT LINE. 3.1 Introduction. " +
      "Motion is common to everything in the universe. We walk, run and ride a bicycle. " +
      "Even when we are sleeping, air moves into and out of our lungs and heart beats to " +
      "circulate blood in the body.",
  );

  it("finds text that survived compaction verbatim", () => {
    const needle = compact("Even when we are sleeping, air moves into and out of our lungs");
    const match = findBestMatch(page, needle);
    expect(match).not.toBeNull();
    expect(match!.score).toBe(1);
    expect(page.slice(match!.start, match!.end)).toBe(needle);
  });

  it("matches across the wording the parser changed", () => {
    // The markdown block says "heartbeats" where the PDF says "heart beats",
    // and drops the sentence the PDF starts with.
    const needle = compact(
      "air moves into and out of our lungs and heartbeats to circulate blood in the body",
    );
    const match = findBestMatch(page, needle);
    expect(match).not.toBeNull();
    expect(match!.score).toBeGreaterThan(MIN_MATCH_SCORE);
    const covered = page.slice(match!.start, match!.end);
    expect(covered).toContain(compact("air moves into and out of our lungs"));
    expect(covered).toContain(compact("circulate blood"));
  });

  it("picks the occurrence that continues the run, not the first one", () => {
    const repeated = compact(
      "Class IX Physics. The first paragraph about force and acceleration here. " +
        "Class IX Physics. The second paragraph about momentum and collisions here.",
    );
    const needle = compact("Class IX Physics. The second paragraph about momentum");
    const match = findBestMatch(repeated, needle);
    expect(match).not.toBeNull();
    // The hint-free search still lands on the second header, because the anchor
    // run has to stay contiguous.
    expect(repeated.slice(match!.start, match!.end)).toContain(compact("second paragraph"));
    expect(match!.start).toBeGreaterThan(repeated.length / 3);
  });

  it("refuses unrelated text instead of guessing", () => {
    const match = findBestMatch(page, compact("Quadratic equations and polynomial factorisation"));
    expect(match === null || match.score < MIN_MATCH_SCORE).toBe(true);
  });

  it("handles empty input", () => {
    expect(findBestMatch("", "abc")).toBeNull();
    expect(findBestMatch("abc", "")).toBeNull();
  });
});

describe("blockForRange", () => {
  const blocks: BlockSpan[] = [
    { el: {} as HTMLElement, start: 0, end: 40 },
    { el: {} as HTMLElement, start: 40, end: 120 },
    { el: {} as HTMLElement, start: 120, end: 200 },
  ];

  it("returns the block holding most of the match", () => {
    expect(blockForRange(blocks, 50, 110)).toBe(blocks[1]);
    // Straddling two blocks resolves to the one with the larger overlap.
    expect(blockForRange(blocks, 100, 190)).toBe(blocks[2]);
  });

  it("returns null when nothing overlaps", () => {
    expect(blockForRange(blocks, 400, 420)).toBeNull();
  });
});

describe("mergeByLine", () => {
  it("merges rects sharing a baseline and keeps separate lines apart", () => {
    const lines = mergeByLine([
      { top: 20, left: 10, width: 150, height: 16 },
      { top: 21, left: 165, width: 120, height: 16 },
      { top: 45, left: 10, width: 220, height: 16 },
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0].left).toBe(10);
    expect(lines[0].width).toBe(275);
    expect(lines[1].top).toBe(45);
    expect(lines[1].width).toBe(220);
  });

  it("returns nothing for an empty set", () => {
    expect(mergeByLine([])).toEqual([]);
  });
});

describe("unionBox", () => {
  it("spans every line of a match", () => {
    const box = unionBox([
      { top: 20, left: 10, width: 150, height: 16 },
      { top: 45, left: 10, width: 220, height: 16 },
    ]);
    expect(box).toEqual({ top: 20, left: 10, width: 220, height: 41 });
  });
});
