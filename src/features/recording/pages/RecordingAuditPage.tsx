import { useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useRecordingAuditLogs } from "@/features/recording/hooks/useRecordings";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Pagination } from "@/shared/components/ui/Pagination";
import { Panel } from "@/shared/components/ui/Panel";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";

const PAGE_SIZE = 20;

export function RecordingAuditPage() {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useRecordingAuditLogs(PAGE_SIZE, offset);

  const total = data?.total ?? 0;
  const pagedLogs = data?.logs ?? [];

  // Server-driven pagination: the API returns only the current page.
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;
  const goNext = () => setOffset((o) => o + PAGE_SIZE);
  const goPrev = () => setOffset((o) => Math.max(0, o - PAGE_SIZE));

  if (isLoading) return <PageSkeleton showStats={false} content="table" />;
  if (isError) return <Alert variant="error">{getErrorMessage(error) || "Failed to load audit logs."}</Alert>;

  return (
    <div className="space-y-6">
      <Panel
        flush
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {total > 0 && <Badge variant="primary">{total} events</Badge>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              loading={isFetching}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
        }
      >
        {pagedLogs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Activity className="h-10 w-10" />}
              title="No audit logs yet"
              description="Processing and management activity will appear here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {pagedLogs.map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                  <Activity className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {log.activity}
                    </p>
                    <Badge variant="info">{log.school_name}</Badge>
                    <Badge>Class {log.class_name}</Badge>
                    {log.section && <Badge>{log.section}</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {log.audio_filename}
                  </p>
                  {log.recording_subject && (
                    <p className="text-xs text-muted-foreground">
                      {log.recording_subject}
                    </p>
                  )}
                </div>
                <p className="flex-shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground">
                  {formatDateTime(
                    log.activity_timestamp ?? log.created_at ?? "",
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        itemsLabel="events"
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={goNext}
        onPrev={goPrev}
      />
    </div>
  );
}
