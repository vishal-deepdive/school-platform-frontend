import { useQuery } from "@tanstack/react-query";
import { Users, Building2, RefreshCw, School } from "lucide-react";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { StatCard } from "@/shared/components/ui/Card";
import { Alert } from "@/shared/components/ui/Alert";
import { getErrorMessage } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Panel } from "@/shared/components/ui/Panel";
import type {
  EnrollmentStatsClass,
  EnrollmentStatsSchool,
} from "@/features/attendance/types";
import { StatCardSkeleton, Skeleton } from "@/shared/components/ui/Skeleton";

function AttendanceStatsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="flex gap-1.5">
                     <Skeleton className="h-5 w-16 rounded-md" />
                     <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendanceStatsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["attendance", "enrollment-stats"],
    queryFn: () => attendanceApi.getEnrollmentStats(),
    staleTime: 2 * 60_000,
  });

  if (isLoading) return <AttendanceStatsSkeleton />;
  if (isError)
    return (
      <Alert variant="error">
        {getErrorMessage(error) || "Failed to load enrollment statistics."}
      </Alert>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Students"
          value={data?.total_students ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="primary"
        />
        <StatCard
          label="Schools"
          value={data?.by_school?.length ?? 0}
          icon={<Building2 className="h-5 w-5" />}
          color="info"
        />
        <StatCard
          label="Avg per School"
          value={
            data && data.by_school?.length
              ? Math.round(data.total_students / data.by_school.length)
              : 0
          }
          icon={<Users className="h-5 w-5" />}
          color="success"
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Enrollment by school
        </h2>
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

      <div className="space-y-4">
        {data?.by_school?.map((school: EnrollmentStatsSchool) => (
          <Panel
            key={school.school_name}
            icon={<School className="h-4 w-4" />}
            title={school.school_name}
            actions={<Badge variant="indigo">{school.total} students</Badge>}
          >
            {school.by_class.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {school.by_class.map((cls: EnrollmentStatsClass) => (
                  <div
                    key={cls.class_name}
                    className="rounded-lg border border-border/60 bg-muted/30 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">
                        Class {cls.class_name}
                      </span>
                      <span className="text-sm font-bold text-primary tabular-nums">
                        {cls.total}
                      </span>
                    </div>
                    {cls.by_section.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cls.by_section.map((sec) => (
                          <span
                            key={sec.section}
                            className="rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs text-muted-foreground"
                            title={
                              sec.by_subject.length > 0 &&
                              sec.by_subject[0].subject !== "No Subject"
                                ? sec.by_subject
                                    .map((sub) => `${sub.subject}: ${sub.count}`)
                                    .join(", ")
                                : undefined
                            }
                          >
                            <span className="font-medium text-foreground/80">
                              Sec {sec.section}
                            </span>
                            <span className="ml-1 tabular-nums">{sec.total}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No class breakdown available.
              </p>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
