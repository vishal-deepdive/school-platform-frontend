import { Activity, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/shared/lib/utils";
import { useRecordingAuditLogs } from "@/features/recording/hooks/useRecordings";
import { usePagination } from "@/shared/hooks/usePagination";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Pagination } from "@/shared/components/ui/Pagination";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { Alert } from "@/shared/components/ui/Alert";

const PAGE_SIZE = 20;

export function RecordingAuditPage() {
  const { data, isLoading, isError, refetch, isFetching } =
    useRecordingAuditLogs();

  const total = data?.total ?? 0;
  const { offset, currentPage, totalPages, hasNext, hasPrev, goNext, goPrev } =
    usePagination(PAGE_SIZE, total);

  const pagedLogs = data?.logs.slice(offset, offset + PAGE_SIZE) ?? [];

  if (isLoading) return <PageSpinner />;
  if (isError) return <Alert variant="error">Failed to load audit logs.</Alert>;

  return (
    <div className="space-y-6">
      <Card padding="none">
        <CardHeader
          title="Audit Log"
          description={`${total} log entries`}
          className="px-6 pt-6"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              loading={isFetching}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          }
        />
        <div className="divide-y divide-border">
          {pagedLogs.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">
              No audit logs yet.
            </p>
          )}
          {pagedLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 px-6 py-4 hover:bg-muted/50"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">
                    {log.activity}
                  </p>
                  <Badge variant="info">{log.school_name}</Badge>
                  <Badge>Class {log.class_name}</Badge>
                  {log.section && <Badge>{log.section}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {log.audio_filename}
                </p>
                {log.recording_subject && (
                  <p className="text-xs text-muted-foreground">
                    {log.recording_subject}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(
                    log.activity_timestamp ?? log.created_at ?? "",
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={goNext}
        onPrev={goPrev}
      />
    </div>
  );
}
