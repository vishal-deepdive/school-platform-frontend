import { describe, expect, it } from "vitest";
import {
  ALL_CLASS_LEVELS,
  GRADE_OPTIONS,
  PRE_PRIMARY_LABEL,
  classSortOrder,
  gradeRangeToClassNames,
} from "./classes";

/**
 * These labels are stored in the database and served by the class roster, so they
 * must stay byte-identical to `app/shared/classes.py`'s ALL_CLASS_LEVELS — a
 * mismatch (e.g. "Nursery/KG" vs "Nursery / KG") silently splits one grade into
 * two across the UI, which is the class of bug the roster was built to end.
 */
describe("canonical class vocabulary", () => {
  it("mirrors the backend vocabulary exactly", () => {
    expect(ALL_CLASS_LEVELS).toHaveLength(13);
    expect(ALL_CLASS_LEVELS[0]).toBe("Nursery / KG");
    expect(ALL_CLASS_LEVELS[1]).toBe("Class 1");
    expect(ALL_CLASS_LEVELS[12]).toBe("Class 12");
  });

  it("indexes grade options by the token persisted on the school", () => {
    expect(GRADE_OPTIONS[0]).toEqual({ value: "0", label: PRE_PRIMARY_LABEL });
    expect(GRADE_OPTIONS[10]).toEqual({ value: "10", label: "Class 10" });
  });

  it("orders grades ascending, like every class picker in the app", () => {
    expect(GRADE_OPTIONS.map((g) => g.label).slice(0, 3)).toEqual([
      PRE_PRIMARY_LABEL,
      "Class 1",
      "Class 2",
    ]);
  });
});

describe("gradeRangeToClassNames", () => {
  it("expands an inclusive range into canonical labels", () => {
    expect(gradeRangeToClassNames("1", "3")).toEqual(["Class 1", "Class 2", "Class 3"]);
  });

  it("includes pre-primary when the range starts at 0", () => {
    expect(gradeRangeToClassNames("0", "1")).toEqual([PRE_PRIMARY_LABEL, "Class 1"]);
  });

  it("returns nothing for an inverted or unparseable range", () => {
    expect(gradeRangeToClassNames("5", "2")).toEqual([]);
    expect(gradeRangeToClassNames("", "")).toEqual([]);
    expect(gradeRangeToClassNames("abc", "3")).toEqual([]);
  });

  it("clamps a range that runs past the vocabulary", () => {
    expect(gradeRangeToClassNames("11", "99")).toEqual(["Class 11", "Class 12"]);
  });
});

describe("classSortOrder", () => {
  it("follows the vocabulary order", () => {
    expect(classSortOrder(PRE_PRIMARY_LABEL)).toBe(0);
    expect(classSortOrder("Class 12")).toBe(12);
  });

  it("sorts a custom class (a stream the vocabulary can't model) last", () => {
    expect(classSortOrder("Class 11 Commerce")).toBe(ALL_CLASS_LEVELS.length);
    expect(classSortOrder(undefined)).toBe(ALL_CLASS_LEVELS.length);
  });
});
