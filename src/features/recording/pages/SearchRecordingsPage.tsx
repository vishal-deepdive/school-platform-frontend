import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Eye, Search, SearchX } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Input } from "@/shared/components/ui/Input";
import { Panel } from "@/shared/components/ui/Panel";
import { ListSkeleton, Skeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { formatDate, getErrorMessage } from "@/shared/lib/utils";
import {
  useSearchRecordings,
  useRecordingPreview,
} from "@/features/recording/hooks/useRecordings";
import { MarkdownPreviewModal } from "@/features/recording/components/MarkdownPreviewModal";
import { useMyChildren } from "@/features/attendance/hooks/useMyChildren";
import { ChildSelector } from "@/features/attendance/components/ChildSelector";

const MIN_QUERY = 2;
const URL_DEFAULTS: { q: string } = { q: "" };

export function SearchRecordingsPage() {
  const [state, update] = useUrlState(URL_DEFAULTS);
  // The submitted search lives in the URL, so results survive refresh and Back.
  const submitted = state.q.trim().length >= MIN_QUERY ? state.q.trim() : "";
  const [query, setQuery] = useState(state.q);
  useEffect(() => {
    setQuery(state.q);
  }, [state.q]);

  const preview = useRecordingPreview();
  const myChildren = useMyChildren();
  const selectedRoll = myChildren.isParent ? myChildren.selectedRoll ?? undefined : undefined;

  const { data, isLoading, isError, error, isFetching } = useSearchRecordings(submitted, selectedRoll);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= MIN_QUERY) update({ q }, { push: true });
  };

  const results = data?.results ?? [];

  return (
    <div className="space-y-4">
      {myChildren.showSelector && (
        <ChildSelector
          childrenList={myChildren.children}
          value={myChildren.selectedRoll}
          onChange={myChildren.setSelectedRoll}
        />
      )}

      <form role="search" onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What did we learn about mitochondria?"
            aria-label="Search lecture notes"
            leftIcon={<Search className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
        <Button
          type="submit"
          disabled={query.trim().length < MIN_QUERY}
          loading={isFetching}
          icon={<Search className="h-4 w-4" />}
          className="self-start sm:self-auto"
        >
          Search
        </Button>
      </form>

      {!submitted ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title="Search your lecture notes"
          description="Ask in your own words — results are matched by meaning, not just keywords, and point you to the lectures that covered it."
        />
      ) : isLoading ? (
        <>
          <Skeleton className="h-4 w-48" />
          <Panel flush>
            <ListSkeleton items={3} />
          </Panel>
        </>
      ) : isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10" />}
          title="Search failed"
          description={
            getErrorMessage(error) || "An error occurred while searching. Please try again."
          }
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-10 w-10" />}
          title="No matching notes"
          description={`No notes matched “${submitted}”. Try a different phrase.`}
        />
      ) : (
        <>
          <StatLine
            items={[
              {
                value: results.length,
                label: (
                  <>
                    {results.length === 1 ? "note matches" : "notes match"} “{submitted}”
                  </>
                ),
              },
            ]}
          />
          <Panel flush>
            <ul className="divide-y divide-border/50">
              {results.map((result) => (
                <li
                  key={result.id}
                  className="flex items-start justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">
                        Class {result.class}
                        {result.section ? `-${result.section}` : ""}
                        {result.subject ? ` · ${result.subject}` : ""}
                      </h3>
                      {result.similarity !== undefined && (
                        <Badge variant={result.similarity > 0.8 ? "success" : "default"}>
                          {Math.max(0, result.similarity * 100).toFixed(0)}% match
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[result.recording_subject, result.school_name, result.date ? formatDate(result.date) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Eye className="h-4 w-4" />}
                    onClick={() => preview.open(result.id, selectedRoll)}
                    className="flex-shrink-0"
                  >
                    Read notes
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}

      <MarkdownPreviewModal open={!!preview.previewId} onClose={preview.close} result={preview.result} />
    </div>
  );
}
