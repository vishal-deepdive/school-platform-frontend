import { Activity } from "lucide-react";
import { cn, formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { useRecordingAuditLogs } from "@/features/recording/hooks/useRecordings";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Pagination } from "@/shared/components/ui/Pagination";
import { Panel } from "@/shared/components/ui/Panel";
import { RefreshButton } from "@/shared/components/ui/RefreshButton";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { useUrlState } from "@/shared/hooks/useUrlState";

const PAGE_SIZE = 20;
const URL_DEFAULTS: { page: number } = { page: 1 };

export function RecordingAuditPage() {
  const [state, update] = useUrlState(URL_DEFAULTS);
  const page = Math.max(1, state.page);

  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData } =
    useRecordingAuditLogs(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const total = data?.total ?? 0;
  const logs = data?.logs ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <ModuleHeaderActions>
        <RefreshButton
          onClick={() => void refetch()}
          refreshing={isFetching && !isLoading}
          label="Refresh activity"
        />
      </ModuleHeaderActions>

      <StatLine loading={isLoading} items={[{ value: total, label: total === 1 ? "event" : "events" }]} />

      {isError ? (
        <Alert variant="error">{getErrorMessage(error) || "Failed to load activity."}</Alert>
      ) : (
        <Panel flush>
          {isLoading ? (
            <ListSkeleton items={6} />
          ) : logs.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={<Activity className="h-10 w-10" />}
              title="No activity yet"
              description="Processing and management activity on recordings will appear here."
            />
          ) : (
            <ul
              className={cn(
                "divide-y divide-border/50 transition-opacity",
                isPlaceholderData && "opacity-60",
              )}
              aria-busy={isPlaceholderData}
            >
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 md:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{log.activity}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[
                        log.school_name,
                        `Class ${log.class_name}${log.section ? `-${log.section}` : ""}`,
                        log.recording_subject,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p
                      className="truncate text-[11px] text-muted-foreground/80"
                      title={log.audio_filename}
                    >
                      {log.audio_filename}
                    </p>
                  </div>
                  <time className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(log.activity_timestamp ?? log.created_at ?? "")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsLabel="events"
        hasNext={page < totalPages && !isPlaceholderData}
        hasPrev={page > 1}
        onNext={() => update({ page: page + 1 })}
        onPrev={() => update({ page: page - 1 })}
      />
    </div>
  );
}
