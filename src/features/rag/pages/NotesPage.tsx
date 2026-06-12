import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { StickyNote, Download } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { ragApi } from "@/features/rag/api/rag";
import { RagFilterPanel } from "@/features/rag/components/RagFilterPanel";
import { getErrorMessage, downloadFile } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import type { RagFilters } from "@/features/rag/types";

export function NotesPage() {
  const [filters, setFilters] = useState<RagFilters>({});
  const [result, setResult] = useState<string | null>(null);

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () => ragApi.generateNotes({ filters }),
    onSuccess: (data) => {
      setResult(data.content);
      toast.success("Lecture notes generated!");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const canGenerate =
    !!filters.class_level &&
    !!filters.subject &&
    !!filters.chapter_name?.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Generate Lecture Notes
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Create comprehensive study notes from textbook chapters.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Select Content" />
          <div className="space-y-4">
            <RagFilterPanel filters={filters} onChange={setFilters} />
            <Button
              onClick={() => generate()}
              loading={isPending}
              disabled={!canGenerate}
              icon={<StickyNote className="h-4 w-4" />}
              className="w-full"
            >
              {isPending ? "Generating…" : "Generate Notes"}
            </Button>
            {!canGenerate && (
              <p className="text-xs text-gray-400">
                Select a class, subject, and chapter to continue.
              </p>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2">
          {result ? (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">Lecture Notes</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() =>
                    downloadFile(
                      result,
                      `notes-${filters.chapter_name?.[0] ?? "chapter"}.md`,
                    )
                  }
                >
                  Download
                </Button>
              </div>
              <div className="prose prose-sm max-w-none overflow-y-auto max-h-[65vh] rounded-lg bg-gray-50 p-4">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </Card>
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
              <StickyNote className="h-12 w-12 text-gray-300" />
              <div>
                <p className="font-semibold text-gray-500">
                  No notes generated yet
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Select a book and chapter, then generate.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
