import { describe, expect, it } from "vitest";
import { guessChapterFromFilename } from "./chapterFilename";

describe("guessChapterFromFilename", () => {
  it.each([
    ["Chapter 4 - Chemical Reactions and Equations.pdf", "4", "Chemical Reactions and Equations"],
    ["ch_04_chemical_reactions.pdf", "4", "Chemical Reactions"],
    ["04. Life Processes.docx", "4", "Life Processes"],
    ["Lesson-12 The Frog.pptx", "12", "The Frog"],
    ["unit 3: Metals and Non-metals.pdf", "3", "Metals and Non-metals"],
    ["chapter2A_motion.pdf", "2A", "Motion"],
    ["jesc101.pdf", "1", ""],
    ["Photosynthesis.pdf", "", "Photosynthesis"],
    ["chemical-reactions-and-equations.pdf", "", "Chemical Reactions and Equations"],
    ["10th Class Science.pdf", "", "10th Class Science"],
  ])("%s", (filename, chapterNumber, chapterName) => {
    expect(guessChapterFromFilename(filename)).toEqual({ chapterNumber, chapterName });
  });
});
