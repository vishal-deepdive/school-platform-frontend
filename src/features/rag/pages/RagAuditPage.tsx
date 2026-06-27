import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw, AlertTriangle, Wrench } from "lucide-react";
import toast from "react-hot-toast";
import { ragApi } from "@/features/rag/api/rag";
import { Card, CardHeader, StatCard } from "@/shared/components/ui/Card";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";

export function RagAuditPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canRebuild = role === "admin" || role === "principal";
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

  if (isLoading) return <PageSpinner />;
  if (isError)
    return <Alert variant="error">{getErrorMessage(error) || "Failed to load RAG audit data."}</Alert>;

  const isEmpty = (data?.total_chunks ?? 0) === 0;
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
              color="indigo"
            />
            <StatCard
              label="Missing Titles"
              value={data?.missing_fields?.titles ?? 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              color={data?.missing_fields?.titles ? "amber" : "green"}
            />
            <StatCard
              label="Missing Chapters"
              value={data?.missing_fields?.chapter_names ?? 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              color={data?.missing_fields?.chapter_names ? "amber" : "green"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[
              { label: "By Class", data: data?.counts?.by_class },
              { label: "By Subject", data: data?.counts?.by_subject },
            ].map(({ label, data: rows }) => (
              <Card key={label} padding="none">
                <CardHeader title={label} className="px-6 pt-6" />
                <div className="divide-y divide-border pb-2">
                  {!rows?.length && (
                    <p className="px-6 py-4 text-sm text-muted-foreground">
                      No data.
                    </p>
                  )}
                  {(rows ?? []).map((row, i) => {
                    const name =
                      row.book ??
                      row.class_level ??
                      row.subject ??
                      row.name ??
                      "—";
                    const count = row.count ?? row.total ?? "—";
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between px-6 py-3"
                      >
                        <p className="text-sm text-foreground truncate">
                          {name}
                        </p>
                        <Badge variant="info">{count} chunks</Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

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
