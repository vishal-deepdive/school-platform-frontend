import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  BookOpen,
  Lightbulb,
  List,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  SlidersHorizontal,
  Square,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { qaSchema } from "@/features/rag/schema";
import { ragApi } from "@/features/rag/api/rag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { ChatMessageBubble } from "@/features/rag/components/ChatMessageBubble";
import { useStreamBatcher } from "@/features/rag/hooks/useStreamBatcher";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { useRagUiStore } from "@/features/rag/store/ragUiStore";
import type { RagFilters } from "@/features/rag/types";

const MAX_TEXTAREA_HEIGHT = 160;
const AUTO_SCROLL_THRESHOLD = 96;

interface SuggestedQuery {
  label: string;
  query: string;
  icon: React.ReactNode;
}

const CHAPTER_ACTIONS: SuggestedQuery[] = [
  { label: "Summarize this chapter", query: "Summarize this chapter", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { label: "Key concepts", query: "What are the key concepts in this chapter?", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { label: "Important topics", query: "List the important topics covered in this chapter", icon: <List className="h-3.5 w-3.5" /> },
  { label: "Key definitions", query: "What are the important definitions in this chapter?", icon: <Sparkles className="h-3.5 w-3.5" /> },
];

const STARTER_SUGGESTIONS: SuggestedQuery[] = [
  { label: "What is this subject about?", query: "What is this subject about?", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { label: "Explain the first topic", query: "Explain the first topic in this textbook", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { label: "Key formulas", query: "What are the key formulas?", icon: <Sparkles className="h-3.5 w-3.5" /> },
];

export function QAPage() {
  const { chat, filters, isStreaming } = useRagUiStore((s) => s.qa);
  const setFilters = useRagUiStore((s) => s.setQaFilters);
  const appendChatMessages = useRagUiStore((s) => s.appendChatMessages);
  const appendToMessage = useRagUiStore((s) => s.appendToMessage);
  const setMessageSources = useRagUiStore((s) => s.setMessageSources);
  const setMessageError = useRagUiStore((s) => s.setMessageError);
  const setQaStreaming = useRagUiStore((s) => s.setQaStreaming);
  const clearQaChat = useRagUiStore((s) => s.clearQaChat);

  const [input, setInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Only one assistant message streams at a time; the batcher flushes batched
  // tokens to whichever message id is currently active.
  const activeIdRef = useRef<string | null>(null);
  const { push: queueToken, flush: flushPending } = useStreamBatcher(
    useCallback(
      (chunk: string) => {
        const id = activeIdRef.current;
        if (id) appendToMessage(id, chunk);
      },
      [appendToMessage],
    ),
  );

  // Auto-resize the textarea up to MAX_TEXTAREA_HEIGHT.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [input]);

  // Keep the transcript pinned to the bottom while streaming, unless the
  // user has scrolled up to read earlier messages.
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distanceFromBottom < AUTO_SCROLL_THRESHOLD);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setAutoScroll(true);
  };

  const runQuery = async (query: string) => {
    const baseId = Date.now();
    const assistantId = `${baseId}-a`;
    activeIdRef.current = assistantId;
    appendChatMessages([
      { id: `${baseId}-u`, role: "user", content: query },
      { id: assistantId, role: "assistant", content: "", sources: [] },
    ]);
    setAutoScroll(true);
    setQaStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of ragApi.qaStream({ query, filters }, controller.signal)) {
        if (event.type === "token") {
          queueToken(event.content);
        } else if (event.type === "done") {
          flushPending();
          setMessageSources(assistantId, event.sources);
        } else if (event.type === "error") {
          flushPending();
          setMessageError(assistantId, event.message);
        }
      }
    } catch (err) {
      flushPending();
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setMessageError(assistantId, getErrorMessage(err));
      }
    } finally {
      flushPending();
      activeIdRef.current = null;
      setQaStreaming(false);
      abortRef.current = null;
    }
  };

  const handleSend = async () => {
    if (isStreaming) return;
    const result = qaSchema.safeParse({ query: input.trim() });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setInput("");
    await runQuery(result.data.query);
  };

  // Re-run the most recent question after a failed answer.
  const handleRetry = () => {
    if (isStreaming) return;
    const lastUser = [...chat].reverse().find((m) => m.role === "user");
    if (lastUser) void runQuery(lastUser.content);
  };

  const lastMessage = chat[chat.length - 1];
  const canRetry =
    !isStreaming && lastMessage?.role === "assistant" && !!lastMessage.isError;

  const handleStop = () => abortRef.current?.abort();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const hasFilters = Object.keys(filters).some(
    (k) => filters[k as keyof RagFilters],
  );

  const hasChapter = !!filters.chapter_name?.length;
  const suggestions = hasChapter ? CHAPTER_ACTIONS : STARTER_SUGGESTIONS;

  const handleQuickAction = (query: string) => {
    if (isStreaming) return;
    void runQuery(query);
  };

  const filterPanel = (
    <div className="space-y-3">
      <RagFilterPanel filters={filters} onChange={setFilters} />
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({})}
          className="w-full"
        >
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      <div className="hidden lg:block w-64 flex-shrink-0 min-w-0">
        <Card className="h-full overflow-y-auto overflow-x-hidden" padding="md">
          <CardHeader title="Filter content" />
          {filterPanel}
        </Card>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquare className="h-4 w-4 text-primary" />
            Ask the textbook
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="relative lg:hidden"
              icon={<SlidersHorizontal className="h-4 w-4" />}
              onClick={() => setShowFilters(true)}
            >
              Filters
              {hasFilters && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Button>
            {chat.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={clearQaChat}
                disabled={isStreaming}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="scrollbar-thin h-full overflow-y-auto p-4 space-y-4"
          >
            {chat.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <MessageSquare className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Ask anything about your textbooks
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground max-w-md">
                    {hasChapter
                      ? "Ask a question or try one of these."
                      : "Select a chapter from filters for summaries, or ask any question below."}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {suggestions.map((s) => (
                    <Button
                      key={s.label}
                      type="button"
                      variant="outline"
                      icon={s.icon}
                      onClick={() => handleQuickAction(s.query)}
                      disabled={isStreaming}
                      className="text-muted-foreground shadow-sm hover:bg-primary/5 hover:border-primary/50"
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              chat.map((msg, i) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && i === chat.length - 1 && msg.role === "assistant"}
                />
              ))
            )}
          </div>

          {!autoScroll && chat.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 h-9 w-9 rounded-full p-0 shadow-md text-muted-foreground"
              aria-label="Scroll to latest message"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="p-3">
          {canRetry && (
            <div className="mb-2 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={handleRetry}
              >
                Retry last question
              </Button>
            </div>
          )}
          {chat.length > 0 && !isStreaming && !canRetry && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <Button
                  key={s.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={s.icon}
                  onClick={() => handleQuickAction(s.query)}
                  className="rounded-full text-muted-foreground hover:border-primary/50"
                >
                  {s.label}
                </Button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the textbook… (Shift+Enter for a new line)"
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
            />
            {isStreaming ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Square className="h-3.5 w-3.5" />}
                onClick={handleStop}
              >
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                icon={<Send className="h-4 w-4" />}
                onClick={() => void handleSend()}
                disabled={!input.trim()}
              >
                Ask
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter content"
        size="sm"
      >
        {filterPanel}
      </Modal>
    </div>
  );
}
