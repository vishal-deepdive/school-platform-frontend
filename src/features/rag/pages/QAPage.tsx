import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, Send, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { qaSchema, type QAFormData } from "@/features/rag/schema";
import { useRagQa } from "@/features/rag/hooks/useRag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import type { RagFilters, ChatMessage } from "@/features/rag/types";

export function QAPage() {
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [filters, setFilters] = useState<RagFilters>({});

  const { mutate: ask, isPending } = useRagQa({
    onSuccess: (data, vars) => {
      setChat((p) => [
        ...p,
        { id: Date.now() + "-u", role: "user", content: vars.query },
        {
          id: Date.now() + "-a",
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);
      reset();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QAFormData>({ resolver: zodResolver(qaSchema) });

  const hasFilters = Object.keys(filters).some(
    (k) => filters[k as keyof RagFilters],
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Textbook Q&A</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ask questions about your textbooks — answers are cited from source
          chapters.
        </p>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <Card className="h-full overflow-y-auto" padding="md">
            <CardHeader title="Filter content" />
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
          </Card>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chat.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
                  <MessageSquare className="h-8 w-8 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Ask anything about your textbooks
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Answers include citations from relevant chapters and pages.
                  </p>
                </div>
              </div>
            )}

            {chat.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-900 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> Sources
                      </p>
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-x-1 text-xs text-gray-500"
                        >
                          {src.chapter_name && <span>{src.chapter_name}</span>}
                          {src.title && <span>· {src.title}</span>}
                          {src.page && (
                            <Badge className="ml-1">p.{src.page}</Badge>
                          )}
                          {src.similarity && (
                            <span className="ml-1 text-gray-400">
                              {src.similarity} match
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-4">
            <form
              onSubmit={handleSubmit((data) =>
                ask({ query: data.query, filters }),
              )}
              className="flex gap-3"
            >
              <input
                {...register("query")}
                placeholder="Ask a question about the textbook…"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                disabled={isPending}
              />
              {errors.query && (
                <p className="text-xs text-red-600">{errors.query.message}</p>
              )}
              <Button
                type="submit"
                loading={isPending}
                icon={<Send className="h-4 w-4" />}
              >
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
