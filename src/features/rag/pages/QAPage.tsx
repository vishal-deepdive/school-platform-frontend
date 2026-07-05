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
import toast from "@/shared/lib/toast";
import { qaSchema } from "@/features/rag/schema";
import { ragApi } from "@/features/rag/api/rag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { ChatMessageBubble } from "@/features/rag/components/ChatMessageBubble";
import { useStreamBatcher } from "@/features/rag/hooks/useStreamBatcher";
import { getErrorMessage } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { FilterBar } from "@/shared/components/ui/FilterBar";
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

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distanceFromBottom < AUTO_SCROLL_THRESHOLD);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setAutoScroll(true);
  }, []);

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

  const handleStop = useCallback(() => abortRef.current?.abort(), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    // handleSend re-creates when input/isStreaming change, but the
    // ref-like closure inside ensures we always call the latest version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleSend],
  );

  const hasFilters = Object.keys(filters).some(
    (k) => filters[k as keyof RagFilters],
  );

  const hasChapter = !!filters.chapter_name?.length;
  const suggestions = hasChapter ? CHAPTER_ACTIONS : STARTER_SUGGESTIONS;

  // The scope the answers are drawn from — surfaced in the toolbar so the
  // reader always knows which textbooks a reply is grounded in.
  const scopeParts = [
    filters.class_level,
    filters.subject,
    filters.chapter_name?.[0],
  ].filter(Boolean) as string[];

  const handleQuickAction = (query: string) => {
    if (isStreaming) return;
    void runQuery(query);
  };

  const filterPanel = (
    <div className="flex flex-col gap-3">
      <RagFilterPanel
        filters={filters}
        onChange={setFilters}
        className="space-y-4"
      />
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({})}
          className="self-start"
        >
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 gap-3 md:gap-4">
      <aside className="hidden w-64 flex-shrink-0 lg:flex lg:flex-col">
        <FilterBar
          title="Answer scope"
          icon={<SlidersHorizontal className="h-4 w-4" />}
          className="min-h-0 flex-1 overflow-y-auto scrollbar-thin"
        >
          {filterPanel}
        </FilterBar>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
        {/* Toolbar — the functional scope of the answers, plus session actions. */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2 md:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
              Answering from
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {scopeParts.length > 0 ? (
                scopeParts.map((part) => (
                  <span
                    key={part}
                    className="max-w-[12rem] truncate rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {part}
                  </span>
                ))
              ) : (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  All textbooks
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="relative lg:hidden"
              icon={<SlidersHorizontal className="h-4 w-4" />}
              onClick={() => setShowFilters(true)}
            >
              Scope
              {hasFilters && (
                <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
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

        {/* Transcript — the only element that scrolls. */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="scrollbar-thin h-full overflow-y-auto px-3 py-5 md:px-4"
          >
            {chat.length === 0 ? (
              <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-5 px-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Ask anything about your textbooks
                  </p>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
                    {hasChapter
                      ? "Ask a question in your own words, or start with one of these."
                      : "Pick a class and subject on the left to focus answers, or just ask a question below."}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => handleQuickAction(s.query)}
                      disabled={isStreaming}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="text-primary">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-6">
                {chat.map((msg, i) => (
                  <ChatMessageBubble
                    key={msg.id}
                    message={msg}
                    isStreaming={
                      isStreaming &&
                      i === chat.length - 1 &&
                      msg.role === "assistant"
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {!autoScroll && chat.length > 0 && (
            <button
              type="button"
              onClick={scrollToBottom}
              aria-label="Scroll to latest message"
              className="absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Composer — pinned; never scrolls out of view. */}
        <div className="shrink-0 border-t border-border/60 bg-card px-3 py-3 md:px-4">
          <div className="mx-auto w-full max-w-3xl">
            {canRetry ? (
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
            ) : (
              chat.length > 0 &&
              !isStreaming && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => handleQuickAction(s.query)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      <span className="text-primary">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              )
            )}

            <div className="flex items-end gap-2 rounded-xl border border-border bg-background py-1.5 pl-3 pr-1.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about the textbook…"
                rows={1}
                disabled={isStreaming}
                className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
              />
              {isStreaming ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Square className="h-3.5 w-3.5" />}
                  onClick={handleStop}
                  className="shrink-0"
                >
                  Stop
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleSend()}
                  disabled={!input.trim()}
                  aria-label="Send question"
                  className="h-9 w-9 shrink-0 rounded-lg p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-1.5 hidden px-1 text-[11px] text-muted-foreground sm:block">
              Press{" "}
              <kbd className="rounded border border-border bg-muted px-1 font-sans text-[10px]">
                Enter
              </kbd>{" "}
              to send ·{" "}
              <kbd className="rounded border border-border bg-muted px-1 font-sans text-[10px]">
                Shift + Enter
              </kbd>{" "}
              for a new line
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Answer scope"
        size="sm"
      >
        {filterPanel}
      </Modal>
    </div>
  );
}
