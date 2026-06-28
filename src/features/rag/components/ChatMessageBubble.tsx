import { memo, useState } from "react";
import {
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Copy,
  FileText,
  User,
  AlertTriangle,
} from "lucide-react";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { cn } from "@/shared/lib/utils";
import type { ChatMessage, QASource } from "@/features/rag/types";

const PREVIEW_COUNT = 3;

function SourceCard({ src, index }: { src: QASource; index: number }) {
  const label =
    src.chapter_name || src.title || src.file || "Source";
  const subtitle = [src.title && src.chapter_name ? src.title : null, src.page ? `p. ${src.page}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group/card flex min-w-[140px] max-w-[200px] flex-col gap-1 rounded-lg border border-border bg-background p-2.5 text-xs shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5">
      <div className="flex items-start gap-2">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {index + 1}
        </span>
        <span className="line-clamp-2 font-medium leading-snug text-foreground">
          {label}
        </span>
      </div>
      {subtitle && (
        <span className="line-clamp-1 pl-7 text-muted-foreground">{subtitle}</span>
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
    <div className="mt-3 space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span>
          {sources.length} source{sources.length > 1 ? "s" : ""}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

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
            className="flex min-w-[100px] items-center justify-center rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
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
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className={cn("group flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={cn("min-w-0 max-w-[85%] sm:max-w-[75%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : message.isError
                ? "rounded-bl-md border border-destructive/20 bg-destructive/10 text-destructive"
                : "rounded-bl-md bg-muted text-foreground",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : message.isError ? (
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{message.content}</span>
            </p>
          ) : message.content ? (
            <MarkdownRenderer content={message.content} streaming={isStreaming} />
          ) : isStreaming ? (
            <div className="flex gap-1 py-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {message.sources && message.sources.length > 0 && (
          <SourcesPanel sources={message.sources} />
        )}

        {!isUser && !message.isError && message.content && !isStreaming && (
          <button
            type="button"
            onClick={handleCopy}
            className="mt-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
});
