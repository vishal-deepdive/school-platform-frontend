import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, BarChart2, MessageSquare, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import {
  surveySearchSchema,
  type SurveySearchFormData,
} from "@/features/survey/schema";
import { surveyApi } from "@/features/survey/api/survey";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import type {
  SearchResponse,
  SearchIntent,
  FeedbackColumn,
} from "@/features/survey/types";
import type { SelectOption } from "@/shared/types/common";

const feedbackOptions: SelectOption[] = [
  { value: "teacher_feedback", label: "Teacher Feedback" },
  { value: "school_feedback", label: "School Feedback" },
  { value: "school_suggestions", label: "School Suggestions" },
];

const limitOptions: SelectOption[] = [5, 10, 20, 50].map((n) => ({
  value: String(n),
  label: `${n} results`,
}));

const intentColors: Record<SearchIntent, "info" | "success" | "purple"> = {
  QUANT: "info",
  QUAL: "success",
  MIXED: "purple",
};

const intentLabels: Record<SearchIntent, string> = {
  QUANT: "Quantitative Analysis",
  QUAL: "Qualitative Search",
  MIXED: "Mixed Analysis",
};

const exampleQueries = [
  "What are students saying about teaching quality in class 10?",
  "Show attendance satisfaction scores by school",
  "Which subjects do students find most difficult?",
  "Compare teacher ratings across schools",
];

export function SurveySearchView() {
  const [result, setResult] = useState<SearchResponse | null>(null);

  const { data: surveyStatus } = useQuery({
    queryKey: ["survey", "status"],
    queryFn: () => surveyApi.getStatus(),
    staleTime: 5 * 60_000,
  });

  const classOptions: SelectOption[] = surveyStatus?.by_class?.map((c) => ({
    value: String((c as any).class),
    label: `${(c as any).class}`,
  })) ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<SurveySearchFormData>({
    resolver: zodResolver(surveySearchSchema),
    defaultValues: {
      class_name: "",
      feedback_column: "school_feedback",
      limit: 10,
    },
  });

  const { mutate: search, isPending } = useMutation({
    mutationFn: (data: SurveySearchFormData) =>
      surveyApi.search({
        query: data.query,
        class_name: data.class_name,
        feedback_column: data.feedback_column as FeedbackColumn,
        limit: data.limit,
      }),
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const loading = isPending || isSubmitting;
  const feedbackCol = watch("feedback_column");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Search"
          description="Use natural language to explore student feedback data."
        />

        <form
          onSubmit={handleSubmit((data) => search(data))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-4">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Query
              </label>
              <div className="relative">
                <input
                  {...register("query")}
                  placeholder="Ask anything about student feedback…"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Select
                label="Class Name"
                options={classOptions}
                placeholder="Select a class..."
                {...register("class_name")}
              />
            </div>
            <div className="sm:col-span-2">
              <Select
                label="Feedback Column"
                options={feedbackOptions}
                value={feedbackCol}
                {...register("feedback_column")}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <Select
              label="Max Results"
              options={limitOptions}
              {...register("limit", { valueAsNumber: true })}
            />
            <div className="flex-1" />
            <Button
              type="submit"
              loading={loading}
              icon={<Sparkles className="h-4 w-4" />}
            >
              {loading ? "Analyzing…" : "Search"}
            </Button>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">Example queries:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setValue("query", q)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Card>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={intentColors[result.intent]}>
              {intentLabels[result.intent]}
            </Badge>
            {result.sql_query && <Badge variant="default">SQL Generated</Badge>}
            <Badge variant="info">
              {result.retrieved_rows.count ??
                result.retrieved_rows.data?.length ??
                0}{" "}
              results
            </Badge>
          </div>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">AI Response</h3>
            </div>
            <div className="prose prose-sm max-w-none rounded-lg bg-gray-50 p-4">
              <ReactMarkdown>{result.final_response}</ReactMarkdown>
            </div>
          </Card>

          {result.chart_url && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Visualization</h3>
              </div>
              <img
                src={surveyApi.getChartUrl(
                  result.chart_url.split("/").pop() ?? "",
                )}
                alt="Survey chart"
                className="max-w-full rounded-lg border border-gray-200"
              />
            </Card>
          )}

          {result.sql_query && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Generated SQL
              </h3>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
                {result.sql_query}
              </pre>
            </Card>
          )}

          {result.retrieved_rows.data &&
            result.retrieved_rows.data.length > 0 && (
              <Card padding="none">
                <CardHeader title="Data Sample" className="px-6 pt-6" />
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(result.retrieved_rows.data[0])
                          .slice(0, 8)
                          .map((key) => (
                            <th
                              key={key}
                              className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500"
                            >
                              {key.replace(/_/g, " ")}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {result.retrieved_rows.data.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row)
                            .slice(0, 8)
                            .map((val, j) => (
                              <td
                                key={j}
                                className="px-4 py-3 text-gray-700 max-w-xs truncate"
                              >
                                {String(val ?? "—")}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
