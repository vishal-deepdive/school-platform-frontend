import { Activity, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/shared/lib/utils";
import { useRecordingAuditLogs } from "@/features/recording/hooks/useRecordings";
import { usePagination } from "@/shared/hooks/usePagination";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Recording Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500">{total} log entries</p>
        </div>
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

      <Card padding="none">
        <div className="divide-y divide-gray-100">
          {pagedLogs.length === 0 && (
            <p className="p-6 text-sm text-gray-400 text-center">
              No audit logs yet.
            </p>
          )}
          {pagedLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <Activity className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">
                    {log.activity}
                  </p>
                  <Badge variant="info">{log.school_name}</Badge>
                  <Badge>Class {log.class_name}</Badge>
                  {log.section && <Badge>{log.section}</Badge>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {log.audio_filename}
                </p>
                {log.recording_subject && (
                  <p className="text-xs text-gray-400">
                    {log.recording_subject}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDateTime(
                    log.activity_timestamp ?? log.created_at ?? "",
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={goPrev}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={goNext}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
