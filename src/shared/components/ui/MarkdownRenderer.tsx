// Side-effect import: patches KaTeX globally to support \ce{} chemistry notation.
import "katex/contrib/mhchem";
import { memo, useMemo, Children, type ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import {
  Info,
  Lightbulb,
  Zap,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { CodeBlock } from "./markdown/CodeBlock";
import { MermaidDiagram } from "./markdown/MermaidDiagram";
import { normalizeMath } from "./markdown/normalizeMarkdown";
import { splitBlocks } from "./markdown/splitBlocks";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /**
   * True while the message is still streaming. Defers Mermaid diagrams and
   * syntax highlighting so a growing block isn't re-tokenised every frame.
   */
  streaming?: boolean;
}

// ── GitHub-style callouts (> [!NOTE], > [!WARNING], …) ──────────────────────

const CALLOUT_MAP: Record<
  string,
  { label: string; Icon: React.ElementType; border: string; bg: string; iconCls: string; titleCls: string }
> = {
  NOTE:      { label: "Note",      Icon: Info,         border: "border-blue-400/50",    bg: "bg-blue-50/70 dark:bg-blue-500/10",    iconCls: "text-blue-500",                         titleCls: "text-blue-700 dark:text-blue-300" },
  TIP:       { label: "Tip",       Icon: Lightbulb,    border: "border-emerald-400/50", bg: "bg-emerald-50/70 dark:bg-emerald-500/10", iconCls: "text-emerald-500",                    titleCls: "text-emerald-700 dark:text-emerald-300" },
  IMPORTANT: { label: "Important", Icon: Zap,          border: "border-primary/50",     bg: "bg-primary/5",                          iconCls: "text-primary",                          titleCls: "text-primary" },
  WARNING:   { label: "Warning",   Icon: AlertTriangle, border: "border-amber-400/50",  bg: "bg-amber-50/70 dark:bg-amber-500/10",   iconCls: "text-amber-500",                        titleCls: "text-amber-700 dark:text-amber-300" },
  CAUTION:   { label: "Caution",   Icon: AlertOctagon,  border: "border-red-400/50",    bg: "bg-red-50/70 dark:bg-red-500/10",       iconCls: "text-destructive",                      titleCls: "text-destructive" },
};

// ── Component map factory ────────────────────────────────────────────────────

function createComponents(streaming: boolean): Components {
  return {
    // ── Code ──────────────────────────────────────────────────────────────
    code({ node: _node, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className ?? "");
      const text = String(children ?? "");
      const isBlock = Boolean(match) || text.includes("\n");

      if (!isBlock) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }

      const language = match?.[1]?.toLowerCase();
      const value = text.replace(/\n$/, "");

      if (language === "mermaid" && !streaming) {
        return <MermaidDiagram chart={value} />;
      }
      return <CodeBlock language={language} value={value} highlight={!streaming} />;
    },

    // Unwrap the default <pre> — CodeBlock / MermaidDiagram render their own.
    pre({ children }) {
      return <>{children}</>;
    },

    // ── Blockquote — plain or GitHub-style callout ─────────────────────
    blockquote({ children, node }) {
      // Inspect the raw HAST node to detect > [!TYPE] callout syntax.
      const firstP = (node as { children?: { type: string; tagName?: string; children?: { type: string; value?: string }[] }[] })
        ?.children?.find((c) => c.type === "element" && c.tagName === "p");
      const firstText = firstP?.children
        ?.map((c) => (c.type === "text" ? (c.value ?? "") : ""))
        .join("") ?? "";
      const match = /^\[!(\w+)\]/.exec(firstText.trim());

      if (match) {
        const cfg = CALLOUT_MAP[match[1].toUpperCase()];
        if (cfg) {
          const { Icon, label, border, bg, iconCls, titleCls } = cfg;
          // Slice off the first child (<p>[!TYPE]…</p>) from the rendered body.
          const body = Children.toArray(children).slice(1);
          return (
            <div
              className={cn(
                "not-prose my-4 rounded-lg border-l-4 p-4",
                border,
                bg,
              )}
            >
              <p className={cn("mb-1.5 flex items-center gap-1.5 text-sm font-semibold", titleCls)}>
                <Icon className={cn("h-4 w-4 shrink-0", iconCls)} />
                {label}
              </p>
              <div className="space-y-1 text-sm text-foreground [&>p]:my-0">
                {body}
              </div>
            </div>
          );
        }
      }

      return (
        <blockquote className="my-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
          {children}
        </blockquote>
      );
    },

    // ── Tables ────────────────────────────────────────────────────────────
    table({ children }) {
      return (
        <div className="my-4 overflow-x-auto rounded-lg border border-border">
          <table className="!my-0 w-full border-collapse text-sm">{children}</table>
        </div>
      );
    },

    thead({ children }) {
      return (
        <thead className="bg-muted/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {children}
        </thead>
      );
    },

    tbody({ children }) {
      return <tbody className="divide-y divide-border bg-background">{children}</tbody>;
    },

    tr({ children }) {
      return <tr className="transition-colors hover:bg-muted/30">{children}</tr>;
    },

    th({ children }) {
      return (
        <th className="px-4 py-2.5 font-semibold text-muted-foreground">{children}</th>
      );
    },

    td({ children }) {
      return <td className="px-4 py-2.5 text-foreground">{children}</td>;
    },

    // ── Links ────────────────────────────────────────────────────────────
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {children}
        </a>
      );
    },

    // ── Images ───────────────────────────────────────────────────────────
    img({ src, alt }) {
      return (
        <img
          src={typeof src === "string" ? src : undefined}
          alt={alt ?? ""}
          loading="lazy"
          className="my-3 max-w-full rounded-lg border border-border"
        />
      );
    },
  };
}

// ── Plugin arrays — module-level constants so identity is stable ─────────────

type ReactMarkdownProps = ComponentProps<typeof ReactMarkdown>;
// remarkBreaks renders a single newline as a line break. LLMs (and our prompts)
// routinely put logically-separate lines — MCQ options "A) …\nB) …", key/value
// pairs, address-style blocks — on consecutive lines with only a single `\n`.
// Plain CommonMark collapses those into one run-on line; remarkBreaks makes each
// render on its own line, matching what the model (and the reader) intends. It
// runs after gfm/math so it never interferes with table/list/math block parsing.
const REMARK_PLUGINS: ReactMarkdownProps["remarkPlugins"] = [remarkGfm, remarkMath, remarkBreaks];

// Physics/chemistry/quantum shorthands that KaTeX doesn't define out of the box
// but that models routinely emit. Macros only expand when their token actually
// appears, so they're inert for content that doesn't use them.
const KATEX_MACROS: Record<string, string> = {
  // Blackboard number sets (double-letter form → low collision risk).
  "\\RR": "\\mathbb{R}",
  "\\NN": "\\mathbb{N}",
  "\\ZZ": "\\mathbb{Z}",
  "\\QQ": "\\mathbb{Q}",
  "\\CC": "\\mathbb{C}",
  // Bra–ket / linear algebra (not built into KaTeX).
  "\\bra": "\\left\\langle #1\\right|",
  "\\ket": "\\left|#1\\right\\rangle",
  "\\braket": "\\left\\langle #1\\right\\rangle",
  "\\ketbra": "\\left|#1\\right\\rangle\\!\\left\\langle #2\\right|",
  // Magnitudes and the upright differential 'd'.
  "\\abs": "\\left|#1\\right|",
  "\\norm": "\\left\\lVert #1\\right\\rVert",
  "\\dd": "\\mathrm{d}",
};

// KaTeX commands guarded by `trust`. Model output can be influenced by uploaded
// documents, so rather than blanket-trusting (which would let `\href` carry a
// `javascript:` URL), we allow only same-safe protocols and refuse external
// image loads. Pure math commands never reach this gate.
const katexTrust = (ctx: { command: string; url?: string }): boolean => {
  if (ctx.command === "\\href" || ctx.command === "\\url") {
    return /^(https?:|mailto:)/i.test(ctx.url ?? "");
  }
  if (ctx.command === "\\includegraphics") return false;
  return true;
};

const REHYPE_PLUGINS: ReactMarkdownProps["rehypePlugins"] = [
  // throwOnError: false — a single malformed formula renders red instead of
  // blanking the whole message (crucial mid-stream, when formulas are partial).
  [rehypeKatex, { throwOnError: false, strict: false, trust: katexTrust, macros: KATEX_MACROS }],
];

// ── Block-memoised body (streaming only) ─────────────────────────────────────

// One top-level Markdown block. Memoised so that, as tokens stream in, only the
// block that is still growing re-parses and re-runs KaTeX/Prism — the settled
// prefix is skipped entirely instead of the whole answer being re-tokenised
// every frame.
const MarkdownBlock = memo(function MarkdownBlock({
  source,
  components,
}: {
  source: string;
  components: Components;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={components}
    >
      {source}
    </ReactMarkdown>
  );
});

// ── Renderer ─────────────────────────────────────────────────────────────────

/**
 * Shared Markdown renderer for AI-generated content (Q&A answers, notes,
 * questions, recordings). Handles:
 *
 * - GFM: tables, task lists, strikethrough, footnotes, autolinks
 * - LaTeX math: $…$, $$…$$, \(…\), \[…\], \begin{align}…\end{align}, etc.
 * - Chemistry: \ce{H2SO4}, \ce{2H2 + O2 -> 2H2O} (mhchem extension)
 * - Syntax-highlighted code blocks (Prism, lazy-loaded)
 * - Mermaid diagrams (deferred until streaming ends)
 * - GitHub-style callouts: > [!NOTE], > [!WARNING], > [!TIP], etc.
 * - Safe links and lazy-loaded images
 *
 * Streaming: while `streaming` is true the body is split into top-level blocks
 * and each is memoised, so only the block still receiving tokens re-parses;
 * half-typed trailing formulas are hidden until their closer arrives. Once the
 * message settles we render it as a single pass so cross-block constructs
 * (footnotes, reference-style links) resolve correctly.
 *
 * rehype-raw is intentionally NOT used — raw HTML in model output (which can
 * be influenced by uploaded documents) would otherwise be rendered as-is.
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
  streaming = false,
}: MarkdownRendererProps) {
  const normalized = useMemo(
    () => normalizeMath(content, { streaming }),
    [content, streaming],
  );
  const components = useMemo(() => createComponents(streaming), [streaming]);
  // Block-split only while streaming; the settled render stays single-pass.
  const blocks = useMemo(
    () => (streaming ? splitBlocks(normalized) : null),
    [streaming, normalized],
  );

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        "prose-headings:scroll-mt-4",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-blockquote:not-italic prose-blockquote:border-primary/30",
        className,
      )}
    >
      {blocks ? (
        blocks.map((source, i) => (
          // Stable key by position: streaming only appends, so block `i` keeps
          // its identity and settled blocks are skipped by React.memo.
          <MarkdownBlock key={i} source={source} components={components} />
        ))
      ) : (
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={components}
        >
          {normalized}
        </ReactMarkdown>
      )}
    </div>
  );
});
