import { useAuthStore } from "@/features/auth/store/auth";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, AlertTriangle, CalendarRange } from "lucide-react";
import { toIndianDate, getErrorMessage } from "@/shared/lib/utils";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { StatCard } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { TableSkeleton } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { Panel } from "@/shared/components/ui/Panel";
import { statusTextClass } from "@/features/attendance/lib/status";
import type { AttendanceRangeStudent } from "@/features/attendance/types";

interface SelfRange {
  start_date: string;
  end_date: string;
}

/**
 * Read-only attendance summary for a student (own records) or a parent (their
 * approved child's records). The server scopes the result to the caller and
 * forces the relevant roll_no, so no class/section/school filters are needed —
 * we only send the date range.
 */
export function SelfAttendanceView() {
  const { user } = useAuthStore();
  const isParent = user?.role === "parent";

  const [filters, setFilters] = useState<SelfRange>({
    start_date: toIndianDate(new Date(Date.now() - 29 * 86400000)),
    end_date: toIndianDate(new Date()),
  });
  const [query, setQuery] = useState<SelfRange | null>({
    start_date: toIndianDate(new Date(Date.now() - 29 * 86400000)),
    end_date: toIndianDate(new Date()),
  });

  const {
    data,
    isLoading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ["attendance", "self-range", query],
    queryFn: () =>
      attendanceApi.getAttendanceRange(
        query as unknown as Record<string, string>,
      ),
    enabled: !!query,
  });

  // Server scopes to a single student/child, so we summarise the first record.
  const me: AttendanceRangeStudent | undefined = data?.data?.[0];
  const isBelow75 = me?.below_75_percent === "Yes";

  return (
    <div className="space-y-6">
      <FilterBar
        title="Date range"
        icon={<CalendarRange className="h-4 w-4" />}
        actions={
          <Button
            onClick={() => setQuery({ ...filters })}
            icon={<Search className="h-4 w-4" />}
          >
            Update
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Start Date (DD-MM-YYYY)"
            value={filters.start_date}
            onChange={(e) =>
              setFilters((p) => ({ ...p, start_date: e.target.value }))
            }
          />
          <Input
            label="End Date (DD-MM-YYYY)"
            value={filters.end_date}
            onChange={(e) =>
              setFilters((p) => ({ ...p, end_date: e.target.value }))
            }
          />
        </div>
      </FilterBar>

      {isLoading && <TableSkeleton rows={6} columns={3} />}
      {isError && (
        <Alert variant="error">
          {getErrorMessage(queryError) || "Failed to load attendance records."}
        </Alert>
      )}

      {data && !me && (
        <EmptyState
          icon={<CalendarRange className="h-10 w-10" />}
          title="No attendance records"
          description={
            isParent
              ? "There are no attendance records for your child in this date range yet."
              : "You have no attendance records in this date range yet."
          }
        />
      )}

      {data && me && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Attendance"
              value={`${me.attendance_percentage.toFixed(0)}%`}
              icon={<CalendarRange className="h-5 w-5" />}
              color={isBelow75 ? "danger" : "success"}
              description={`${me.name} · #${me.roll_number}${
                me.class ? ` · Class ${me.class}` : ""
              }${me.section ? `-${me.section}` : ""}`}
            />
            <StatCard
              label="Days Present"
              value={me.total_present}
              color="success"
            />
            <StatCard
              label="Days Absent"
              value={me.total_absent}
              color="danger"
            />
          </div>

          {isBelow75 && (
            <Alert variant="warning" title="Attendance is below 75%">
              <p className="text-sm">
                {isParent
                  ? "Your child's attendance is below the 75% requirement for this period."
                  : "Your attendance is below the 75% requirement for this period."}
              </p>
            </Alert>
          )}

          <Panel icon={<CalendarRange className="h-4 w-4" />} title="Recent days">
            {data.dates && data.dates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.dates.map((d: string, i: number) => {
                  const status = me.cells[i] ?? "-";
                  return (
                    <div
                      key={d}
                      className="flex min-w-[4.5rem] flex-col items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                    >
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {d}
                      </span>
                      <span
                        className={`text-base font-bold ${statusTextClass(status)}`}
                      >
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                No per-day records in this range.
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
