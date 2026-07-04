import { useQuery } from "@tanstack/react-query";
import { Users, Building2, RefreshCw } from "lucide-react";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { Card, CardHeader, StatCard } from "@/shared/components/ui/Card";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { getErrorMessage } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import type {
  EnrollmentStatsClass,
  EnrollmentStatsSchool,
} from "@/features/attendance/types";

export function AttendanceStatsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["attendance", "enrollment-stats"],
    queryFn: () => attendanceApi.getEnrollmentStats(),
    staleTime: 2 * 60_000,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError)
    return <Alert variant="error">{getErrorMessage(error) || "Failed to load enrollment statistics."}</Alert>;

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

      <Card padding="none">
        <CardHeader
          className="px-6 pt-6"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              loading={isFetching}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          }
        />
        <div className="divide-y divide-border">
          {data?.by_school?.map((school: EnrollmentStatsSchool) => (
            <div key={school.school_name} className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-foreground">
                  {school.school_name}
                </p>
                <Badge variant="indigo">{school.total} students</Badge>
              </div>

              {school.by_class.length > 0 && (
                <div className="space-y-2">
                  {school.by_class.map((cls: EnrollmentStatsClass) => (
                    <div
                      key={cls.class_name}
                      className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          Class {cls.class_name}
                        </span>
                        <span className="text-primary font-semibold">
                          {cls.total}
                        </span>
                      </div>
                      {cls.by_section.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {cls.by_section.map((sec) => (
                            <span
                              key={sec.section}
                              className="rounded border border-border bg-background px-2 py-0.5 text-muted-foreground"
                            >
                              Sec {sec.section}: {sec.total}
                              {sec.by_subject.length > 0 &&
                                sec.by_subject[0].subject !== "No Subject" && (
                                  <span className="text-muted-foreground/70">
                                    {" "}
                                    (
                                    {sec.by_subject
                                      .map(
                                        (sub) =>
                                          `${sub.subject}: ${sub.count}`,
                                      )
                                      .join(", ")}
                                    )
                                  </span>
                                )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
