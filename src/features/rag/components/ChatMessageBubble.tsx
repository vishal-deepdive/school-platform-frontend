import { memo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Sparkles,
} from "lucide-react";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { Button } from "@/shared/components/ui/Button";
import { cn } from "@/shared/lib/utils";
import type { ChatMessage, QASource } from "@/features/rag/types";

const PREVIEW_COUNT = 3;

function SourceCard({ src, index }: { src: QASource; index: number }) {
  const label = src.chapter_name || src.title || src.file || "Source";
  const subtitle = [
    src.title && src.chapter_name ? src.title : null,
    src.page ? `p. ${src.page}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-w-[150px] max-w-[220px] flex-col gap-1 rounded-lg border border-border bg-background p-2.5 text-xs transition-colors hover:border-primary/40 hover:bg-primary/5">
      <div className="flex items-start gap-2">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {index + 1}
        </span>
        <span className="line-clamp-2 font-medium leading-snug text-foreground">
          {label}
        </span>
      </div>
      {subtitle && (
        <span className="line-clamp-1 pl-7 text-muted-foreground">
          {subtitle}
        </span>
      )}
      {src.similarity && (
        <span className="pl-7 text-[10px] font-medium text-primary">
          {src.similarity} match
        </span>
      )}
    </div>
  );
}

function SourcesPanel({ sources }: { sources: QASource[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = sources.length > PREVIEW_COUNT;
  const visible = expanded ? sources : sources.slice(0, PREVIEW_COUNT);

  return (
    <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setExpanded((v) => !v)}
        icon={<FileText className="h-3.5 w-3.5 text-primary" />}
        className="h-auto px-0 py-0 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        {sources.length} source{sources.length > 1 ? "s" : ""}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </Button>

      <div
        className={cn(
          "flex gap-2 overflow-x-auto pb-1 scrollbar-thin",
          expanded ? "flex-wrap" : "flex-nowrap",
        )}
      >
        {visible.map((src, i) => (
          <SourceCard key={i} src={src} index={i} />
        ))}

        {!expanded && hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="min-w-[100px] rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            +{sources.length - PREVIEW_COUNT} more
          </button>
        )}
      </div>
    </div>
  );
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  isStreaming,
}: ChatMessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // A question — a compact bubble anchored to the right.
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }

  // An answer — full width so tables, code, and math read like a textbook
  // passage rather than being squeezed into a chat bubble.
  return (
    <div className="group flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
        <Sparkles className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        {message.isError ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{message.content}</span>
          </div>
        ) : message.content ? (
          <MarkdownRenderer content={message.content} streaming={isStreaming} />
        ) : isStreaming ? (
          <div className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground">
            <span>Thinking</span>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          </div>
        ) : null}

        {message.sources && message.sources.length > 0 && (
          <SourcesPanel sources={message.sources} />
        )}

        {!message.isError && message.content && !isStreaming && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            icon={
              copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )
            }
            className="mt-1.5 px-1.5 py-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </div>
    </div>
  );
});
