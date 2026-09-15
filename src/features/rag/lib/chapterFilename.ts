/**
 * Best-effort chapter number / name from an uploaded file's name, used to
 * pre-fill batch upload rows. Anything it can't recognise is left blank for
 * the user to fill in — a wrong guess costs more than no guess.
 */
export interface ChapterGuess {
  chapterNumber: string;
  chapterName: string;
}

const EXTENSION = /\.[a-z0-9]{1,5}$/i;
// NCERT e-book codes: class letter (a–l = 1–12), medium letter, 2–3 letter
// subject code, book digit, 2-digit chapter — e.g. "jesc101" is Class 10
// English Science, chapter 1. Only the chapter part is used.
const NCERT_CODE = /^[a-l][eh][a-z]{2,3}\d(\d{2})$/i;
// "Chapter 4 - …", "ch_04_…", "Lesson-12 …", "Unit 3: …"
const LABELLED =
  /^(?:chapter|chap|ch|lesson|unit)[\s._-]*(\d{1,3}[a-z]?)(?![a-z0-9])[\s._:)-]*/i;
// "04. Life Processes", "4 - Motion", "12_the_frog"
const LEADING = /^(\d{1,3}[a-z]?)(?:\s*[._:)-]+\s*|\s+)(?=\S)/i;

const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with",
]);

function normalizeNumber(raw: string): string {
  const match = /^0*(\d+)([a-z]?)$/i.exec(raw);
  return match ? `${Number(match[1])}${match[2].toUpperCase()}` : raw;
}

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i > 0 && MINOR_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function cleanName(raw: string): string {
  let name = raw.replace(/_+/g, " ");
  // "chemical-reactions" style names use hyphens/dots as word separators;
  // names that already have spaces keep inner hyphens ("Non-metals").
  if (!/\s/.test(name.trim())) name = name.replace(/[-.]+/g, " ");
  name = name
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—:.,)]+|[\s\-–—:.,(]+$/g, "")
    .trim();
  // Only re-case names typed in a single case; respect deliberate casing.
  if (name && (name === name.toLowerCase() || name === name.toUpperCase())) {
    name = titleCase(name);
  }
  return name;
}

export function guessChapterFromFilename(filename: string): ChapterGuess {
  const base = filename.replace(EXTENSION, "").trim();

  const ncert = NCERT_CODE.exec(base);
  if (ncert) return { chapterNumber: normalizeNumber(ncert[1]), chapterName: "" };

  const match = LABELLED.exec(base) ?? LEADING.exec(base);
  if (!match) return { chapterNumber: "", chapterName: cleanName(base) };

  return {
    chapterNumber: normalizeNumber(match[1]),
    chapterName: cleanName(base.slice(match[0].length)),
  };
}
