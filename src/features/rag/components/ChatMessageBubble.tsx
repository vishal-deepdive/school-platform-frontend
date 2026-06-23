import { memo, useState } from "react";
import { BookOpen, Bot, Check, Copy, User, AlertTriangle } from "lucide-react";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { cn } from "@/shared/lib/utils";
import type { ChatMessage } from "@/features/rag/types";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  /** True while this specific message is still receiving tokens. */
  isStreaming?: boolean;
}

/**
 * Renders one chat turn (user or assistant). Memoized so that appending
 * tokens to the in-progress assistant message — which replaces the `chat`
 * array reference on every flush — doesn't re-render every prior bubble
 * (their message objects stay referentially stable across that update).
 */
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
            // Render Markdown live as it streams. The renderer defers the
            // expensive bits while streaming (Mermaid diagrams show as code,
            // syntax highlighting is skipped) so growing answers stay smooth.
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
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.sources.map((src, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
              >
                <BookOpen className="h-3 w-3 text-primary" />
                {src.chapter_name && <span>{src.chapter_name}</span>}
                {src.title && <span>· {src.title}</span>}
                {src.page && <span>· p.{src.page}</span>}
                {src.similarity && (
                  <span className="font-medium text-primary">{src.similarity}</span>
                )}
              </span>
            ))}
          </div>
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
