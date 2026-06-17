import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/shared/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Shared Markdown renderer for AI-generated content (Q&A answers, notes,
 * questions). Supports GFM tables and LaTeX math ($...$ / $$...$$) via
 * remark-gfm + remark-math/rehype-katex, styled through Tailwind Typography's
 * `prose` classes.
 *
 * rehype-raw is intentionally NOT used — raw HTML in model output (which can
 * be influenced by uploaded documents) would otherwise be rendered as-is.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
