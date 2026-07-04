import { useState, type FormEvent } from "react";
import { Search, FileText, Eye } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { formatDate, getErrorMessage } from "@/shared/lib/utils";
import {
  useSearchRecordings,
  useRecordingPreview,
} from "@/features/recording/hooks/useRecordings";
import { MarkdownPreviewModal } from "@/features/recording/components/MarkdownPreviewModal";

export function SearchRecordingsPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const preview = useRecordingPreview();

  const { data, isLoading, isError, error, isFetching } =
    useSearchRecordings(submittedQuery);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setSubmittedQuery(query.trim());
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSearch} className="flex gap-3 p-6">
          <div className="flex-1">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g., What did we learn about mitochondria?"
              leftIcon={<Search className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
          <Button type="submit" disabled={query.length < 2 || isFetching}>
            {isFetching ? "Searching..." : "Search"}
          </Button>
        </form>
      </Card>

      {submittedQuery && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">
            Results for &quot;{submittedQuery}&quot;
          </h2>

          {isLoading ? (
            <ListSkeleton items={3} />
          ) : isError ? (
            <Alert variant="error">{getErrorMessage(error) || "An error occurred while searching. Please try again."}</Alert>
          ) : data?.results?.length === 0 ? (
            <Alert variant="info">
              No matching notes found for your query.
            </Alert>
          ) : (
            <div className="grid gap-4">
              {data?.results.map((result) => (
                <Card
                  key={result.id}
                  className="hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between p-5">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-1">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">
                            Class {result.class}{" "}
                            {result.section ? `- ${result.section}` : ""}
                          </h3>
                          {result.similarity !== undefined && (
                            <Badge
                              variant={
                                result.similarity > 0.8 ? "success" : "default"
                              }
                            >
                              {Math.max(0, result.similarity * 100).toFixed(0)}% Match
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="default">{result.school_name}</Badge>
                          {result.subject && (
                            <Badge variant="info">{result.subject}</Badge>
                          )}
                          {result.recording_subject && (
                            <Badge variant="info">
                              {result.recording_subject}
                            </Badge>
                          )}
                          {result.date && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              {formatDate(result.date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Eye className="h-4 w-4" />}
                      onClick={() => preview.open(result.id)}
                    >
                      Read Notes
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <MarkdownPreviewModal
        open={!!preview.previewId}
        onClose={preview.close}
        result={preview.result}
      />
    </div>
  );
}
