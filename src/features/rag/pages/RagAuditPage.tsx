import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  RefreshCw,
  AlertTriangle,
  Wrench,
  Layers,
  BookOpen,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { ragApi } from "@/features/rag/api/rag";
import { StatCard } from "@/shared/components/ui/Card";
import { Panel } from "@/shared/components/ui/Panel";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { canManageRecordings } from "@/shared/lib/permissions";
import { CoverageMatrix } from "@/features/rag/components/CoverageMatrix";

export function RagAuditPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canRebuild = canManageRecordings(role);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["rag", "audit"],
    queryFn: () => ragApi.getAudit(),
    staleTime: 2 * 60_000,
  });

  const handleRebuild = async () => {
    setIsRebuilding(true);
    try {
      await ragApi.refreshMetadata();
      toast.success("Metadata cache rebuilt.");
      await queryClient.invalidateQueries({ queryKey: ["rag", "audit"] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsRebuilding(false);
    }
  };

  if (isLoading) return <PageSkeleton />;
  if (isError)
    return <Alert variant="error">{getErrorMessage(error) || "Failed to load RAG audit data."}</Alert>;

  const totalChunks = data?.total_chunks ?? 0;
  const isEmpty = totalChunks === 0;
  const hasMissingMetadata =
    (data?.missing_fields?.titles ?? 0) > 0 ||
    (data?.missing_fields?.chapter_names ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {canRebuild && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRebuild}
            loading={isRebuilding}
            icon={<Wrench className="h-4 w-4" />}
          >
            Rebuild metadata cache
          </Button>
        )}
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

      {isEmpty && (
        <EmptyState
          icon={<Database className="h-12 w-12" />}
          title="Your knowledge base is empty"
          description={
            canRebuild
              ? "Upload textbook documents in Manage Documents to start indexing content."
              : "No indexed content is available yet. Ask a teacher or admin to upload textbooks."
          }
        />
      )}

      {!isEmpty && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Chunks"
              value={data?.total_chunks ?? 0}
              icon={<Database className="h-5 w-5" />}
              color="primary"
            />
            <StatCard
              label="Missing Titles"
              value={data?.missing_fields?.titles ?? 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              color={data?.missing_fields?.titles ? "warning" : "success"}
            />
            <StatCard
              label="Missing Chapters"
              value={data?.missing_fields?.chapter_names ?? 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              color={data?.missing_fields?.chapter_names ? "warning" : "success"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[
              {
                label: "By Class",
                icon: <Layers className="h-4 w-4" />,
                data: data?.counts?.by_class,
              },
              {
                label: "By Subject",
                icon: <BookOpen className="h-4 w-4" />,
                data: data?.counts?.by_subject,
              },
            ].map(({ label, icon, data: rows }) => (
              <Panel
                key={label}
                flush
                icon={icon}
                title={label}
                actions={<Badge variant="info">{rows?.length ?? 0}</Badge>}
              >
                {!rows?.length ? (
                  <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">
                    No data.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {rows.map((row, i) => {
                      const name =
                        row.book ??
                        row.class_level ??
                        row.subject ??
                        row.name ??
                        "—";
                      const rawCount = row.count ?? row.total;
                      const pct =
                        typeof rawCount === "number" && totalChunks > 0
                          ? Math.round((rawCount / totalChunks) * 100)
                          : null;
                      return (
                        <li key={i} className="px-4 py-3 md:px-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-medium text-foreground">
                              {name}
                            </p>
                            <Badge variant="info">
                              {rawCount ?? "—"} chunks
                            </Badge>
                          </div>
                          {pct !== null && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                                {pct}%
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            ))}
          </div>

          <CoverageMatrix />

          {hasMissingMetadata ? (
            <Alert variant="warning" title="Missing Metadata Detected">
              Some chunks are missing title or chapter metadata. This may affect
              search quality.
              {canRebuild
                ? ' Use "Rebuild metadata cache" above to refresh coverage, then re-upload any affected documents.'
                : " Ask an admin to rebuild the metadata cache and re-upload any affected documents."}
            </Alert>
          ) : (
            <Alert variant="success">
              All chunks have complete metadata. Your knowledge base is in good
              shape.
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
