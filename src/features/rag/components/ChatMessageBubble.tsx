import { memo, useState } from "react";
import toast from "@/shared/lib/toast";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Quote,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  BookmarkCheck,
  Lightbulb,
  Languages,
} from "lucide-react";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { cn } from "@/shared/lib/utils";
import type { ChatMessage, QASource } from "@/features/rag/types";

const PREVIEW_COUNT = 3;

function sourceLabel(src: QASource): string {
  return src.chapter_name || src.title || src.file || "Source";
}

function SourceCard({
  src,
  index,
  onView,
}: {
  src: QASource;
  index: number;
  onView?: () => void;
}) {
  const label = sourceLabel(src);
  const subtitle = [
    src.title && src.chapter_name ? src.title : null,
    src.page ? `p. ${src.page}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const clickable = !!src.snippet && !!onView;

  return (
    <button
      type="button"
      onClick={clickable ? onView : undefined}
      aria-disabled={!clickable}
      title={clickable ? "View the passage this cites" : undefined}
      className={cn(
        "flex min-w-[150px] max-w-[220px] flex-col gap-1 rounded-lg border border-border bg-background p-2.5 text-left text-xs transition-colors",
        clickable
          ? "cursor-pointer hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
          : "cursor-default",
      )}
    >
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
      <span className="flex items-center gap-2 pl-7">
        {src.similarity && (
          <span className="text-[10px] font-medium text-primary">
            {src.similarity} match
          </span>
        )}
        {clickable && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
            <Quote className="h-2.5 w-2.5" /> passage
          </span>
        )}
      </span>
    </button>
  );
}

function SourcesPanel({ sources }: { sources: QASource[] }) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<QASource | null>(null);
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
          <SourceCard key={i} src={src} index={i} onView={() => setPreview(src)} />
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

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? sourceLabel(preview) : "Source"}
        description={
          preview
            ? [preview.title && preview.chapter_name ? preview.title : null, preview.page ? `Page ${preview.page}` : null]
                .filter(Boolean)
                .join(" · ") || undefined
            : undefined
        }
        icon={<Quote className="h-5 w-5" />}
        size="lg"
      >
        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {preview.similarity && <Badge variant="info">{preview.similarity} match</Badge>}
              {preview.file && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" /> {preview.file}
                </span>
              )}
            </div>
            <blockquote className="rounded-lg border-l-2 border-primary/40 bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground">
              {preview.snippet}
            </blockquote>
            <p className="text-xs text-muted-foreground">
              This is the textbook passage the answer drew from.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  /** Current feedback for this answer, if the user already rated it. */
  feedback?: "up" | "down" | null;
  onFeedback?: (rating: "up" | "down") => void;
  /** Whether this answer is bookmarked. */
  isSaved?: boolean;
  onToggleSave?: () => void;
  /** Re-ask the same question for a simpler explanation. */
  onExplainSimpler?: () => void;
  /** Re-ask the same question, answered in a different language. */
  onTranslate?: () => void;
  /** Button label for onTranslate — the language it switches TO (e.g. "Hindi"
   * for an English-default school, "English" for a Hindi-default one). */
  translateLabel?: string;
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  isStreaming,
  feedback,
  onFeedback,
  isSaved,
  onToggleSave,
  onExplainSimpler,
  onTranslate,
  translateLabel = "Hindi",
}: ChatMessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(message.content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("Couldn't copy to clipboard."));
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
          <div className="flex w-fit items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-4 py-2 text-sm text-muted-foreground shadow-sm">
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            <span className="animate-pulse font-medium">Thinking...</span>
          </div>
        ) : null}

        {message.sources && message.sources.length > 0 && (
          <SourcesPanel sources={message.sources} />
        )}

        {!message.isError && message.content && !isStreaming && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
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
              className="px-1.5 py-0.5 text-muted-foreground"
            >
              {copied ? "Copied" : "Copy"}
            </Button>

            {onFeedback && (
              <>
                <Tooltip content="Helpful" side="top">
                  <button
                    type="button"
                    onClick={() => onFeedback("up")}
                    aria-label="Mark answer helpful"
                    aria-pressed={feedback === "up"}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted",
                      feedback === "up"
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip content="Not helpful" side="top">
                  <button
                    type="button"
                    onClick={() => onFeedback("down")}
                    aria-label="Mark answer not helpful"
                    aria-pressed={feedback === "down"}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted",
                      feedback === "down"
                        ? "text-destructive"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </>
            )}

            {onToggleSave && (
              <Tooltip content={isSaved ? "Saved" : "Save answer"} side="top">
                <button
                  type="button"
                  onClick={onToggleSave}
                  aria-label={isSaved ? "Remove bookmark" : "Save answer"}
                  aria-pressed={isSaved}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted",
                    isSaved
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isSaved ? (
                    <BookmarkCheck className="h-3.5 w-3.5" />
                  ) : (
                    <Bookmark className="h-3.5 w-3.5" />
                  )}
                </button>
              </Tooltip>
            )}

            {(onExplainSimpler || onTranslate) && (
              <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
            )}

            {onExplainSimpler && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onExplainSimpler}
                icon={<Lightbulb className="h-3 w-3" />}
                className="px-1.5 py-0.5 text-muted-foreground"
              >
                Explain simpler
              </Button>
            )}

            {onTranslate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onTranslate}
                icon={<Languages className="h-3 w-3" />}
                className="px-1.5 py-0.5 text-muted-foreground"
              >
                {translateLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
