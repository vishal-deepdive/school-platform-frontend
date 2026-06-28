/**
 * Normalises LaTeX math delimiters so `remark-math` (which only understands
 * `$…$` / `$$…$$`) can render them.
 *
 * Models — and the LlamaParse-extracted textbook content the RAG answers are
 * grounded in — frequently emit math as `\( … \)` (inline) and `\[ … \]`
 * (display) instead of dollar signs. They also output bare LaTeX environments
 * such as `\begin{align}…\end{align}` and chemistry notation `\ce{H2O}`.
 * Left as-is, every such span renders as raw text. We rewrite them to the
 * dollar-sign delimiter forms that remark-math understands, taking care NOT
 * to touch anything inside fenced code blocks or inline code.
 */

// One regex pass pulls out the spans we must leave untouched:
//   ```…``` closed fence | ```…EOF open fence (streaming) | `…` inline code
const PROTECT_RE = /```[\s\S]*?```|```[\s\S]*$|`[^`\n]*`/g;

const INLINE_RE  = /\\\(([\s\S]+?)\\\)/g; // \( … \)  → $ … $
const DISPLAY_RE = /\\\[([\s\S]+?)\\\]/g; // \[ … \]  → $$ … $$

// Bare \begin{env}…\end{env} blocks NOT immediately preceded by $ (already
// in math mode). Covers the most common display-math environments.
// Negative lookbehind (?<!\$) prevents double-wrapping when the env is already
// inside $$…$$ produced by the DISPLAY_RE pass above.
const ENV_NAMES =
  "align\\*?|equation\\*?|gather\\*?|multline\\*?|eqnarray\\*?|" +
  "cases|split|alignat\\*?|flalign\\*?|subequations";
const DISPLAY_ENV_RE = new RegExp(
  `(?<!\\$)\\\\begin\\{(${ENV_NAMES})\\}([\\s\\S]*?)\\\\end\\{\\1\\}`,
  "g",
);

// Bare \ce{…} outside math delimiters → $\ce{…}$  (requires mhchem extension)
const BARE_CE_RE = /(?<!\$)\\ce\{([^}]+)\}/g;

// Private-use-area sentinel — never appears in real Markdown content.
const SENTINEL = String.fromCharCode(0xe000);
const RESTORE_RE = new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, "g");

export function normalizeMath(input: string): string {
  const hasMath =
    input.includes("\\(") ||
    input.includes("\\[") ||
    input.includes("\\begin{") ||
    input.includes("\\ce{");

  if (!hasMath) return input;

  // Stash code spans behind sentinels so their contents are never rewritten.
  const stash: string[] = [];
  let text = input.replace(PROTECT_RE, (match) => {
    stash.push(match);
    return `${SENTINEL}${stash.length - 1}${SENTINEL}`;
  });

  text = text
    // \[ … \]  →  $$ … $$  (display math)
    .replace(DISPLAY_RE, (_m, body: string) => `$$${body}$$`)
    // \( … \)  →  $ … $  (inline math)
    .replace(INLINE_RE, (_m, body: string) => `$${body}$`)
    // bare \begin{env}…\end{env}  →  $$\begin{env}…\end{env}$$
    .replace(DISPLAY_ENV_RE, (match) => `$$\n${match}\n$$`)
    // bare \ce{…}  →  $\ce{…}$
    .replace(BARE_CE_RE, (match) => `$${match}$`);

  // Restore the protected code spans.
  return text.replace(RESTORE_RE, (_m, i: string) => stash[Number(i)] ?? "");
}
