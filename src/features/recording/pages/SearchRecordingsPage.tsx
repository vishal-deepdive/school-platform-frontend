import { useState, type FormEvent } from "react";
import { Search, FileText, Eye, AlertTriangle, SearchX } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { Panel } from "@/shared/components/ui/Panel";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { formatDate, getErrorMessage } from "@/shared/lib/utils";
import {
  useSearchRecordings,
  useRecordingPreview,
} from "@/features/recording/hooks/useRecordings";
import { MarkdownPreviewModal } from "@/features/recording/components/MarkdownPreviewModal";
import { useMyChildren } from "@/features/attendance/hooks/useMyChildren";
import { ChildSelector } from "@/features/attendance/components/ChildSelector";

export function SearchRecordingsPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const preview = useRecordingPreview();
  const myChildren = useMyChildren();
  const selectedRoll = myChildren.isParent ? myChildren.selectedRoll ?? undefined : undefined;

  const { data, isLoading, isError, error, isFetching } =
    useSearchRecordings(submittedQuery, selectedRoll);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setSubmittedQuery(query.trim());
    }
  };

  const results = data?.results ?? [];

  return (
    <div className="space-y-6">
      {myChildren.showSelector && (
        <ChildSelector
          childrenList={myChildren.children}
          value={myChildren.selectedRoll}
          onChange={myChildren.setSelectedRoll}
        />
      )}
      <form onSubmit={handleSearch}>
        <FilterBar
          title="Search notes"
          icon={<Search className="h-4 w-4" />}
          actions={
            <Button
              type="submit"
              disabled={query.length < 2 || isFetching}
              loading={isFetching}
              icon={<Search className="h-4 w-4" />}
            >
              {isFetching ? "Searching…" : "Search"}
            </Button>
          }
        >
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="E.g., What did we learn about mitochondria?"
            leftIcon={<Search className="h-4 w-4 text-muted-foreground" />}
          />
        </FilterBar>
      </form>

      {submittedQuery &&
        (isLoading ? (
          <ListSkeleton items={3} />
        ) : isError ? (
          <EmptyState
            icon={<AlertTriangle className="h-10 w-10" />}
            title="Search failed"
            description={
              getErrorMessage(error) ||
              "An error occurred while searching. Please try again."
            }
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-10 w-10" />}
            title="No matching notes"
            description={`No notes matched “${submittedQuery}”. Try a different phrase.`}
          />
        ) : (
          <Panel
            flush
            icon={<FileText className="h-4 w-4" />}
            title={`Results for “${submittedQuery}”`}
            actions={<Badge variant="primary">{results.length} found</Badge>}
          >
            <ul className="divide-y divide-border/50">
              {results.map((result) => (
                <li
                  key={result.id}
                  className="group flex items-start justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5"
                >
                  <div className="flex min-w-0 gap-3">
                    <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">
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
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge variant="default">{result.school_name}</Badge>
                        {result.subject && (
                          <Badge variant="info">{result.subject}</Badge>
                        )}
                        {result.recording_subject && (
                          <Badge variant="purple">
                            {result.recording_subject}
                          </Badge>
                        )}
                        {result.date && (
                          <span className="text-xs text-muted-foreground">
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
                    onClick={() => preview.open(result.id, selectedRoll)}
                    className="flex-shrink-0"
                  >
                    Read Notes
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        ))}

      <MarkdownPreviewModal
        open={!!preview.previewId}
        onClose={preview.close}
        result={preview.result}
      />
    </div>
  );
}
