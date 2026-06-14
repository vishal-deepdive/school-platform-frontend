import { useQuery } from "@tanstack/react-query";
import { Database, RefreshCw, AlertTriangle } from "lucide-react";
import { ragApi } from "@/features/rag/api/rag";
import { Card, CardHeader, StatCard } from "@/shared/components/ui/Card";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";

export function RagAuditPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["rag", "audit"],
    queryFn: () => ragApi.getAudit(),
    staleTime: 2 * 60_000,
  });

  if (isLoading) return <PageSpinner />;
  if (isError)
    return <Alert variant="error">Failed to load RAG audit data.</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
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
                <p className="px-6 py-4 text-sm text-muted-foreground">No data.</p>
              )}
              {(rows ?? []).map((row, i) => {
                const r = row as Record<string, unknown>;
                const name = String(
                  r.book ?? r.class_level ?? r.subject ?? r.name ?? "—",
                );
                const count = String(r.count ?? r.total ?? "—");
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <p className="text-sm text-foreground truncate">{name}</p>
                    <Badge variant="info">{count} chunks</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {(data?.missing_fields?.titles ?? 0) > 0 ||
      (data?.missing_fields?.chapter_names ?? 0) > 0 ? (
        <Alert variant="warning" title="Missing Metadata Detected">
          Some chunks are missing title or chapter metadata. This may affect
          search quality. Re-index your textbooks to ensure full coverage.
        </Alert>
      ) : (
        <Alert variant="success">
          All chunks have complete metadata. Your knowledge base is in good
          shape.
        </Alert>
      )}
    </div>
  );
}
