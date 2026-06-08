import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { StickyNote, Download } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { ragApi } from "@/features/rag/api/rag";
import { getErrorMessage, downloadFile } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import type { RagFilters } from "@/features/rag/types";
import type { SelectOption } from "@/shared/types/common";

export function NotesPage() {
  const [filters, setFilters] = useState<RagFilters>({});
  const [result, setResult] = useState<string | null>(null);

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ["rag", "metadata"],
    queryFn: () => ragApi.getMetadata(),
    staleTime: 10 * 60_000,
  });

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () => ragApi.generateNotes({ filters }),
    onSuccess: (data) => {
      setResult(data.content);
      toast.success("Lecture notes generated!");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const bookOptions: SelectOption[] =
    meta?.books?.map((b) => ({ value: b, label: b })) ?? [];
  const subjectOptions: SelectOption[] =
    meta?.subjects?.map((s) => ({ value: s, label: s })) ?? [];
  const chapterOptions: SelectOption[] =
    meta?.chapters?.map((c) => ({ value: c, label: c })) ?? [];

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
          {metaLoading ? (
            <PageSpinner />
          ) : (
            <div className="space-y-4">
              <Select
                label="Book"
                options={[{ value: "", label: "All books" }, ...bookOptions]}
                value={filters.book ?? ""}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    book: e.target.value || undefined,
                  }))
                }
              />
              <Select
                label="Subject"
                options={[
                  { value: "", label: "All subjects" },
                  ...subjectOptions,
                ]}
                value={filters.subject ?? ""}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    subject: e.target.value || undefined,
                  }))
                }
              />
              <Select
                label="Chapter"
                options={[
                  { value: "", label: "All chapters" },
                  ...chapterOptions,
                ]}
                value={filters.chapter_name?.[0] ?? ""}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    chapter_name: e.target.value ? [e.target.value] : undefined,
                  }))
                }
              />

              <Button
                onClick={() => generate()}
                loading={isPending}
                icon={<StickyNote className="h-4 w-4" />}
                className="w-full"
              >
                {isPending ? "Generating…" : "Generate Notes"}
              </Button>
            </div>
          )}
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
