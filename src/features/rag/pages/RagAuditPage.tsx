import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Database, Languages, Layers, Wrench } from "lucide-react";
import toast from "@/shared/lib/toast";
import { ragApi } from "@/features/rag/api/rag";
import { ActionMenu } from "@/shared/components/ui/ActionMenu";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ModuleHeaderActions } from "@/shared/components/ui/ModuleHeaderActions";
import { Panel } from "@/shared/components/ui/Panel";
import { RefreshButton } from "@/shared/components/ui/RefreshButton";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import { CardSkeleton, Skeleton } from "@/shared/components/ui/Skeleton";
import { StatLine } from "@/shared/components/ui/StatLine";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { getErrorMessage } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import { canManageRecordings } from "@/shared/lib/permissions";
import { CoverageMatrix } from "@/features/rag/components/CoverageMatrix";

type Dimension = "class" | "subject" | "medium";

const DIMENSIONS: { value: Dimension; label: string; icon: React.ReactNode }[] = [
  { value: "class", label: "Class", icon: <Layers className="h-3.5 w-3.5" /> },
  { value: "subject", label: "Subject", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { value: "medium", label: "Medium", icon: <Languages className="h-3.5 w-3.5" /> },
];
const URL_DEFAULTS: { by: string } = { by: "class" };

function RagAuditSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-4 w-72 max-w-full" />
      <CardSkeleton lines={6} />
      <CardSkeleton lines={4} />
    </div>
  );
}

export function RagAuditPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canRebuild = canManageRecordings(role);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [state, update] = useUrlState(URL_DEFAULTS);
  const dimension: Dimension =
    state.by === "subject" || state.by === "medium" ? state.by : "class";

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

  const header = (
    <ModuleHeaderActions>
      <RefreshButton
        onClick={() => void refetch()}
        refreshing={(isFetching && !isLoading) || isRebuilding}
        label="Refresh coverage"
      />
      {canRebuild && (
        <ActionMenu
          label="More coverage actions"
          items={[
            {
              label: isRebuilding ? "Rebuilding cache…" : "Rebuild metadata cache",
              icon: <Wrench />,
              disabled: isRebuilding,
              onSelect: () => void handleRebuild(),
            },
          ]}
        />
      )}
    </ModuleHeaderActions>
  );

  if (isLoading) {
    return (
      <>
        {header}
        <RagAuditSkeleton />
      </>
    );
  }
  if (isError) {
    return (
      <div className="space-y-6">
        {header}
        <Alert variant="error">{getErrorMessage(error) || "Failed to load coverage data."}</Alert>
      </div>
    );
  }

  const totalChunks = data?.total_chunks ?? 0;
  const isEmpty = totalChunks === 0;
  const missingTitles = data?.missing_fields?.titles ?? 0;
  const missingChapters = data?.missing_fields?.chapter_names ?? 0;
  const hasMissingMetadata = missingTitles > 0 || missingChapters > 0;

  const rowsByDimension = {
    class: data?.counts?.by_class,
    subject: data?.counts?.by_subject,
    medium: data?.counts?.by_medium,
  };
  const rows = rowsByDimension[dimension] ?? [];
  const activeDimension = DIMENSIONS.find((d) => d.value === dimension) ?? DIMENSIONS[0];

  return (
    <div className="space-y-6">
      {header}

      {isEmpty ? (
        <EmptyState
          icon={<Database className="h-12 w-12" />}
          title="Your knowledge base is empty"
          description={
            canRebuild
              ? "Upload textbook chapters to start indexing content."
              : "No indexed content is available yet. Ask a teacher or admin to upload textbooks."
          }
          action={
            canRebuild ? (
              <Button asChild size="sm">
                <Link to="/rag/documents">Open Textbook Library</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            <StatLine
              items={[
                { value: totalChunks, label: "indexed passages" },
                {
                  value: missingTitles,
                  label: missingTitles === 1 ? "missing a title" : "missing titles",
                  tone: "warning",
                  hidden: missingTitles === 0,
                },
                {
                  value: missingChapters,
                  label: missingChapters === 1 ? "missing a chapter name" : "missing chapter names",
                  tone: "warning",
                  hidden: missingChapters === 0,
                },
                {
                  label: "Metadata complete",
                  icon: <CheckCircle2 />,
                  tone: "success",
                  hidden: hasMissingMetadata,
                },
              ]}
            />
            {hasMissingMetadata && (
              <Alert variant="warning" title="Some passages are missing metadata">
                This can make answers harder to find.
                {canRebuild
                  ? " Rebuild the metadata cache from the ⋯ menu above, then re-upload any affected chapters."
                  : " Ask an admin to rebuild the metadata cache and re-upload any affected chapters."}
              </Alert>
            )}
          </div>

          <CoverageMatrix />

          <Panel
            flush
            icon={activeDimension.icon}
            title="Indexed passages"
            description="How the knowledge base is spread"
            actions={
              <SegmentedControl
                aria-label="Group passages by"
                options={DIMENSIONS}
                value={dimension}
                onChange={(by) => update({ by }, { push: true })}
              />
            }
          >
            {rows.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">No data.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {rows.map((row, i) => {
                  const name =
                    row.book ?? row.class_level ?? row.subject ?? row.medium ?? row.name ?? "—";
                  const rawCount = row.count ?? row.total;
                  const pct =
                    typeof rawCount === "number" && totalChunks > 0
                      ? Math.round((rawCount / totalChunks) * 100)
                      : null;
                  return (
                    <li key={i} className="px-4 py-3 md:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-foreground">{name}</p>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {typeof rawCount === "number" ? rawCount.toLocaleString() : "—"}
                          {pct !== null && ` · ${pct}%`}
                        </span>
                      </div>
                      {pct !== null && (
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
