import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Boxes, Globe, Library } from "lucide-react";
import { ragApi } from "@/features/rag/api/rag";
import { Card, StatCard } from "@/shared/components/ui/Card";
import { Badge, type BadgeVariant } from "@/shared/components/ui/Badge";
import { ChartSkeleton, StatCardSkeleton } from "@/shared/components/ui/Skeleton";
import { BarList } from "@/features/dashboard/components/BarList";

const STATUS_BADGES: Record<string, BadgeVariant> = {
  completed: "success",
  pending: "warning",
  failed: "danger",
};

/**
 * Knowledge-base corpus analytics, rendered from GET /rag/analytics. Shows the
 * size and composition of the textbook library the caller can query. Admins see
 * platform-wide totals; principals/teachers see global content plus their
 * school's uploads. Self-hides when RAG access is not granted (403).
 */
export function LibraryAnalyticsSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rag", "analytics"],
    queryFn: () => ragApi.getAnalytics(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // No RAG access (teachers must be granted) — hide silently.
  if (isError || !data) return null;

  const t = data.totals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Knowledge base</h3>
            <p className="text-xs text-muted-foreground">
              {data.scope === "platform"
                ? "Textbook content indexed across the platform"
                : "Textbooks available for AI-powered Q&A at your school"}
            </p>
          </div>
        </div>
        <Link
          to="/rag/documents"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Manage <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Documents"
          value={t.documents}
          icon={<BookOpen className="h-5 w-5" />}
          color="primary"
          description={`${t.completed} ready to query`}
        />
        <StatCard
          label="Indexed passages"
          value={t.chunks.toLocaleString()}
          icon={<Boxes className="h-5 w-5" />}
          color="info"
          description="searchable chunks"
        />
        <StatCard
          label="Subjects"
          value={t.subjects}
          icon={<Library className="h-5 w-5" />}
          color="success"
          description={`across ${t.class_levels} ${t.class_levels === 1 ? "grade" : "grades"}`}
        />
        <StatCard
          label="Shared library"
          value={t.global_docs}
          icon={<Globe className="h-5 w-5" />}
          color="warning"
          description={`${t.school_docs} school-specific`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card padding="md">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">By subject</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Documents per subject</p>
          </div>
          <BarList
            items={data.by_subject.map((s) => ({ label: s.subject, value: s.count }))}
            emptyLabel="No documents yet."
          />
        </Card>

        <Card padding="md">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">By grade</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Documents per class level</p>
          </div>
          <BarList
            items={data.by_class.map((c) => ({ label: c.class_level, value: c.count }))}
            emptyLabel="No documents yet."
          />
        </Card>

        <Card padding="md">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground">Recently added</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Latest ingested documents</p>
          </div>
          {data.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recent.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {d.chapter_name || d.subject || "Document"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[d.class_level, d.subject].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGES[d.status] ?? "default"}>{d.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
