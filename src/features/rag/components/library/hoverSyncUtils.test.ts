import { describe, expect, it } from "vitest";
import {
  computeTextSimilarity,
  extractKeywords,
  getUnionBoundingBox,
  normalizeText,
} from "./hoverSyncUtils";

describe("hoverSyncUtils", () => {
  it("normalizes text by stripping punctuation and lowercasing", () => {
    expect(normalizeText("Hello, World! Here is Section 1.2: Gravity.")).toBe(
      "hello world here is section 1 2 gravity",
    );
  });

  it("extracts significant keywords and filters stop words", () => {
    const keywords = extractKeywords("The quick brown fox jumps over the lazy dog and runs into the park");
    expect(keywords).toContain("quick");
    expect(keywords).toContain("brown");
    expect(keywords).toContain("jumps");
    expect(keywords).toContain("lazy");
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("and");
    expect(keywords).not.toContain("into");
  });

  it("computes high similarity for matching or overlapping phrases", () => {
    const simExact = computeTextSimilarity("Newton's second law", "Newton's second law of motion");
    expect(simExact).toBe(1.0);

    const simKeywords = computeTextSimilarity(
      "Conservation of energy in closed systems",
      "In any closed system, energy conservation is maintained throughout all thermodynamic reactions",
    );
    expect(simKeywords).toBeGreaterThan(0.4);

    const simDifferent = computeTextSimilarity("Photosynthesis in green plants", "Quadratic equations and polynomials");
    expect(simDifferent).toBe(0);
  });

  it("computes union bounding box for element rects", () => {
    const mockContainer = {
      getBoundingClientRect: () => ({ top: 100, left: 100, width: 800, height: 600 }),
      scrollTop: 0,
      scrollLeft: 0,
    } as unknown as HTMLElement;

    const el1 = {
      getBoundingClientRect: () => ({ top: 150, left: 120, width: 100, height: 20 }),
    } as unknown as HTMLElement;

    const el2 = {
      getBoundingClientRect: () => ({ top: 180, left: 120, width: 250, height: 30 }),
    } as unknown as HTMLElement;

    const box = getUnionBoundingBox([el1, el2], mockContainer);
    expect(box).not.toBeNull();
    expect(box?.top).toBe(50); // 150 - 100
    expect(box?.left).toBe(20); // 120 - 100
    expect(box?.width).toBe(250); // 120 + 250 - 120
    expect(box?.height).toBe(60); // 180 + 30 - 150
  });
});
