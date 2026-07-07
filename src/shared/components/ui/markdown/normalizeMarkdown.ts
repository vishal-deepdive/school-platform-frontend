/**
 * Normalises LaTeX math delimiters so `remark-math` (which only understands
 * `$…$` / `$$…$$`) can render them.
 *
 * Models — and the LlamaParse-extracted textbook content the RAG answers are
 * grounded in — frequently emit math as `\( … \)` (inline) and `\[ … \]`
 * (display) instead of dollar signs. They also output bare LaTeX environments
 * such as `\begin{align}…\end{align}`, matrices, and chemistry/physics-unit
 * notation (`\ce{H2O}`, `\pu{9.8 m/s^2}`). Left as-is, every such span renders
 * as raw text. We rewrite them to the dollar-sign delimiter forms that
 * remark-math understands.
 *
 * Robustness comes from a stash-then-rewrite approach: fenced/inline code AND
 * already-delimited math spans are pulled out behind sentinels first, so the
 * bare-environment / bare-chemistry rewrites can only ever touch content that
 * is genuinely outside math mode. That avoids double-wrapping the extremely
 * common `$$\n\begin{bmatrix}…\end{bmatrix}\n$$` shape.
 *
 * When `streaming` is true we additionally hide a half-typed trailing formula
 * (an opener whose closer hasn't streamed in yet) so a growing equation doesn't
 * flash as raw LaTeX and then snap into rendered math a frame later.
 */

// Spans we must never rewrite inside — pulled out first:
//   ```…``` closed fence | ```…EOF open fence (streaming) | `…` inline code
const CODE_RE = /```[\s\S]*?```|```[\s\S]*$|`[^`\n]*`/g;

const INLINE_DELIM_RE  = /\\\(([\s\S]+?)\\\)/g; // \( … \)  → $ … $
const DISPLAY_DELIM_RE = /\\\[([\s\S]+?)\\\]/g; // \[ … \]  → $$ … $$

// Balanced math spans, stashed after delimiter conversion so the bare-env /
// bare-chem rewrites below can't reach into them. Display first, then inline.
const DISPLAY_MATH_RE = /\$\$[\s\S]*?\$\$/g;
const INLINE_MATH_RE  = /\$(?:\\.|[^\n$\\])+?\$/g;

// Bare \begin{env}…\end{env} blocks. Covers common display-math and matrix
// environments — matrices/aligned/gathered are only legal inside math mode, so
// wrapping a bare one in $$…$$ is what the model meant. Anything already inside
// $…$/$$…$$ has been stashed away, so no lookbehind guard is needed.
const ENV_NAMES =
  "align\\*?|equation\\*?|gather\\*?|multline\\*?|eqnarray\\*?|" +
  "cases|dcases|split|aligned|gathered|alignat\\*?|flalign\\*?|subequations|" +
  "array|matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|smallmatrix|CD";
const DISPLAY_ENV_RE = new RegExp(
  `\\\\begin\\{(${ENV_NAMES})\\}([\\s\\S]*?)\\\\end\\{\\1\\}`,
  "g",
);

// Bare \ce{…} / \pu{…} (mhchem: chemical equations / physical units). The body
// tolerates one level of nested braces, e.g. \pu{9.8 m/s^{2}}.
const BARE_CHEM_RE = /\\(?:ce|pu)\{(?:[^{}]|\{[^{}]*\})*\}/g;

// Private-use-area sentinels — never appear in real Markdown content. Separate
// codepoints for code vs math so each can be restored at a different stage.
const SENT_CODE = String.fromCharCode(0xe000);
const SENT_MATH = String.fromCharCode(0xe001);
const CODE_RESTORE_RE = new RegExp(`${SENT_CODE}(\\d+)${SENT_CODE}`, "g");
const MATH_RESTORE_RE = new RegExp(`${SENT_MATH}(\\d+)${SENT_MATH}`, "g");

/**
 * Offset at which a half-finished `$…`/`$$…` math region begins at the very end
 * of the string, or -1 if the tail is balanced. Scans delimiter-by-delimiter,
 * honouring `\$` escapes, so currency like `$5` (a lone `$` with no closer) is
 * only trimmed when the fragment actually looks like a formula.
 */
function incompleteTrailingMathStart(text: string): number {
  let inInline = false;
  let inDisplay = false;
  let openIdx = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") {
      i++; // skip the escaped character (covers \$, \\, etc.)
      continue;
    }
    if (ch !== "$") continue;

    if (text[i + 1] === "$") {
      if (!inInline) {
        inDisplay = !inDisplay;
        openIdx = inDisplay ? i : -1;
      }
      i++; // consume the second `$`
    } else if (!inDisplay) {
      inInline = !inInline;
      openIdx = inInline ? i : -1;
    }
  }

  if (inDisplay) return openIdx; // display math is unambiguous — always hide
  if (!inInline) return -1;
  // Inline `$` is only trimmed when the fragment reads like math, so prose
  // "$5 and change" is left intact.
  return /[\\^_{}]/.test(text.slice(openIdx)) ? openIdx : -1;
}

/**
 * Offset of a trailing opener that couldn't be converted because its closer
 * hasn't streamed in yet — `\(`, `\[`, `\begin{…`, `\ce{…`, `\pu{…` — or -1.
 */
function incompleteTrailingCommandStart(text: string): number {
  // Each alternative anchors at end-of-string: an opener whose closer never
  // arrives. (Complete \(…\) / \[…\] were already converted to $…$ upstream, so
  // any surviving \( or \[ here is genuinely unterminated.)
  const m =
    /\\\((?:(?!\\\))[\s\S])*$|\\\[(?:(?!\\\])[\s\S])*$|\\begin\{[^}]*$|\\begin\{[a-zA-Z*]+\}(?:(?!\\end\{)[\s\S])*$|\\(?:ce|pu)\{[^}]*$/.exec(
      text,
    );
  return m ? m.index : -1;
}

interface NormalizeOptions {
  /** Hide half-typed trailing formulas while the response is streaming. */
  streaming?: boolean;
}

export function normalizeMath(
  input: string,
  { streaming = false }: NormalizeOptions = {},
): string {
  const hasMath =
    input.includes("$") ||
    input.includes("\\(") ||
    input.includes("\\[") ||
    input.includes("\\begin{") ||
    input.includes("\\ce{") ||
    input.includes("\\pu{");

  if (!hasMath) return input;

  // 1. Stash code spans — their contents are never rewritten.
  const codeStash: string[] = [];
  let text = input.replace(CODE_RE, (m) => {
    codeStash.push(m);
    return `${SENT_CODE}${codeStash.length - 1}${SENT_CODE}`;
  });

  // 2. Convert \[ … \] / \( … \) delimiters to $$ … $$ / $ … $.
  text = text
    .replace(DISPLAY_DELIM_RE, (_m, body: string) => `$$${body}$$`)
    .replace(INLINE_DELIM_RE, (_m, body: string) => `$${body}$`);

  // 3. Stash balanced math spans so the bare-env / bare-chem rewrites below
  //    can only touch content that is genuinely outside math mode.
  const mathStash: string[] = [];
  const stashMath = (m: string) => {
    mathStash.push(m);
    return `${SENT_MATH}${mathStash.length - 1}${SENT_MATH}`;
  };
  text = text.replace(DISPLAY_MATH_RE, stashMath).replace(INLINE_MATH_RE, stashMath);

  // 4. Wrap the now-guaranteed-bare environments and chem/unit macros.
  text = text
    .replace(DISPLAY_ENV_RE, (m) => `$$\n${m}\n$$`)
    .replace(BARE_CHEM_RE, (m) => `$${m}$`);

  // 5. Restore math spans (code stays stashed for the streaming scan below).
  text = text.replace(MATH_RESTORE_RE, (_m, i: string) => mathStash[Number(i)] ?? "");

  // 6. While streaming, cut whichever incomplete tail starts earliest. Code is
  //    still stashed, so `$`/`\` inside code can't confuse the scan.
  if (streaming) {
    const cuts = [
      incompleteTrailingMathStart(text),
      incompleteTrailingCommandStart(text),
    ].filter((n) => n >= 0);
    if (cuts.length) text = text.slice(0, Math.min(...cuts));
  }

  // 7. Restore code spans.
  return text.replace(CODE_RESTORE_RE, (_m, i: string) => codeStash[Number(i)] ?? "");
}
