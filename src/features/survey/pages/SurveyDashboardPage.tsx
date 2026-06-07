import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart2, RefreshCw, Download, Users, Database } from "lucide-react";
import toast from "react-hot-toast";
import { formatDateTime, getErrorMessage } from "@/shared/lib/utils";
import { surveyApi } from "@/features/survey/api/survey";
import { Card, CardHeader, StatCard } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { Alert } from "@/shared/components/ui/Alert";

export function SurveyDashboardPage() {
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["survey", "status"],
    queryFn: () => surveyApi.getStatus(),
    staleTime: 2 * 60_000,
  });

  const { mutate: syncSheets, isPending: syncing } = useMutation({
    mutationFn: () => surveyApi.loadRecent(),
    onSuccess: (res) => {
      toast.success(
        `Synced! +${res.summary.records_added} added, ${res.summary.records_skipped} skipped`,
      );
      qc.invalidateQueries({ queryKey: ["survey"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) return <PageSpinner />;
  if (isError)
    return <Alert variant="error">Failed to load survey status.</Alert>;

  const embeddingFields = Object.entries(data?.embeddings ?? {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Survey Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Student feedback overview — last updated{" "}
            {formatDateTime(data?.timestamp ?? "")}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => syncSheets()}
            loading={syncing}
            icon={<Download className="h-4 w-4" />}
          >
            Sync Google Sheets
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Responses"
          value={data?.total_records ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          label="Schools"
          value={data?.by_school?.length ?? 0}
          icon={<BarChart2 className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Classes"
          value={data?.by_class?.length ?? 0}
          icon={<Database className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Embedding Columns"
          value={embeddingFields.length}
          icon={<Database className="h-5 w-5" />}
          color="indigo"
        />
      </div>

      {embeddingFields.length > 0 && (
        <Card>
          <CardHeader title="Embeddings Coverage" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {embeddingFields.map(([field, count]) => (
              <div
                key={field}
                className="rounded-lg bg-gray-50 border border-gray-200 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  {field.replace(/_/g, " ")}
                </p>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round(((count as number) / (data?.total_records ?? 1)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {Math.round(
                    ((count as number) / (data?.total_records ?? 1)) * 100,
                  )}
                  % covered
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data?.by_school && data.by_school.length > 0 && (
          <Card padding="none">
            <CardHeader title="Responses by School" className="px-6 pt-6" />
            <div className="divide-y divide-gray-100 pb-2">
              {data.by_school.map((s, i) => {
                const school = s as Record<string, unknown>;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <p className="text-sm text-gray-700">
                      {String(school.school_name ?? "—")}
                    </p>
                    <Badge variant="info">
                      {String(school.count ?? 0)} responses
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {data?.by_class && data.by_class.length > 0 && (
          <Card padding="none">
            <CardHeader title="Responses by Class" className="px-6 pt-6" />
            <div className="divide-y divide-gray-100 pb-2">
              {data.by_class.map((c, i) => {
                const cls = c as Record<string, unknown>;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <p className="text-sm text-gray-700">
                      {String(cls.class ?? cls.class_name ?? "—")}
                    </p>
                    <Badge variant="success">
                      {String(cls.count ?? 0)} responses
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
