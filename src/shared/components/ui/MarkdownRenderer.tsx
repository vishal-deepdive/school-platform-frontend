import { memo, useMemo, type ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/shared/lib/utils";
import { CodeBlock } from "./markdown/CodeBlock";
import { MermaidDiagram } from "./markdown/MermaidDiagram";
import { normalizeMath } from "./markdown/normalizeMarkdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /**
   * True while the message is still streaming. In this mode we render Markdown
   * live (so the user sees formatted output, not raw syntax) but defer the two
   * expensive operations until the response is complete: Mermaid diagrams
   * (partial source throws) render as a code block, and code highlighting is
   * skipped so a growing block isn't re-tokenised every frame.
   */
  streaming?: boolean;
}

/**
 * Builds the element-renderer map. Created per `streaming` value (memoised by
 * the caller) so its identity stays stable across token flushes — react-markdown
 * re-parses whenever the `components` reference changes.
 */
function createComponents(streaming: boolean): Components {
  return {
    // react-markdown v9 dropped the `inline` flag, so we distinguish a fenced
    // block from inline code by a `language-*` class or a newline. Block code
    // routes to the rich CodeBlock (or a Mermaid diagram); inline code keeps the
    // lightweight prose styling.
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

      // Render the diagram only once the source is complete; while streaming a
      // partial diagram would just error, so show its source as code instead.
      if (language === "mermaid" && !streaming) {
        return <MermaidDiagram chart={value} />;
      }
      return <CodeBlock language={language} value={value} highlight={!streaming} />;
    },

    // CodeBlock / MermaidDiagram render their own container, so unwrap the
    // default <pre> to avoid a block element nested inside it.
    pre({ children }) {
      return <>{children}</>;
    },

    // Wrap tables so wide ones scroll horizontally instead of overflowing.
    table({ children }) {
      return (
        <div className="my-3 overflow-x-auto rounded-lg border border-border">
          <table className="!my-0 w-full border-collapse text-sm">{children}</table>
        </div>
      );
    },

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

type ReactMarkdownProps = ComponentProps<typeof ReactMarkdown>;
const REMARK_PLUGINS: ReactMarkdownProps["remarkPlugins"] = [remarkGfm, remarkMath];
// `throwOnError: false` keeps a single malformed formula (common in streamed
// physics/math output) from blanking the whole message — KaTeX renders the bad
// snippet in red instead of throwing.
const REHYPE_PLUGINS: ReactMarkdownProps["rehypePlugins"] = [
  [rehypeKatex, { throwOnError: false, strict: false }],
];

/**
 * Shared Markdown renderer for AI-generated content (Q&A answers, notes,
 * questions, recordings). Handles GFM tables, LaTeX math ($...$ / $$...$$ as
 * well as \(...\) / \[...\]), syntax-highlighted code blocks, and Mermaid
 * diagrams, styled through Tailwind Typography's `prose` classes.
 *
 * rehype-raw is intentionally NOT used — raw HTML in model output (which can be
 * influenced by uploaded documents) would otherwise be rendered as-is.
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
  streaming = false,
}: MarkdownRendererProps) {
  const normalized = useMemo(() => normalizeMath(content), [content]);
  const components = useMemo(() => createComponents(streaming), [streaming]);

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none break-words", className)}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
});
