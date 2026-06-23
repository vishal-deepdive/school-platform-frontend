/**
 * Normalises LaTeX math delimiters so `remark-math` (which only understands
 * `$…$` / `$$…$$`) can render them.
 *
 * Models — and the LlamaParse-extracted textbook content the RAG answers are
 * grounded in — frequently emit math as `\( … \)` (inline) and `\[ … \]`
 * (display) instead of dollar signs. Left as-is, every such span renders as raw
 * text. We rewrite them to dollar delimiters, taking care NOT to touch anything
 * inside fenced code blocks or inline code (where `\(` is just text).
 */

// One regex pass pulls out the spans we must leave untouched:
//   ```…``` closed fence | ```…EOF open fence (streaming) | `…` inline code
const PROTECT_RE = /```[\s\S]*?```|```[\s\S]*$|`[^`\n]*`/g;

const INLINE_RE = /\\\(([\s\S]+?)\\\)/g; // \( … \)  → $ … $
const DISPLAY_RE = /\\\[([\s\S]+?)\\\]/g; // \[ … \]  → $$ … $$

// Private-use-area sentinel — never appears in real Markdown content.
const SENTINEL = String.fromCharCode(0xe000);
const RESTORE_RE = new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, "g");

export function normalizeMath(input: string): string {
  if (!input.includes("\\(") && !input.includes("\\[")) return input;

  // Stash code spans behind sentinels so their contents are never rewritten.
  const stash: string[] = [];
  let text = input.replace(PROTECT_RE, (match) => {
    stash.push(match);
    return `${SENTINEL}${stash.length - 1}${SENTINEL}`;
  });

  text = text
    .replace(DISPLAY_RE, (_m, body: string) => `$$${body}$$`)
    .replace(INLINE_RE, (_m, body: string) => `$${body}$`);

  // Restore the protected code spans.
  return text.replace(RESTORE_RE, (_m, i: string) => stash[Number(i)] ?? "");
}
