import { useAuthStore } from "@/features/auth/store/auth";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, AlertTriangle } from "lucide-react";
import { toIndianDate } from "@/shared/lib/utils";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { Alert } from "@/shared/components/ui/Alert";
import type { AttendanceRangeStudent } from "@/features/attendance/types";

interface RangeFilters {
  school_name: string;
  start_date: string;
  end_date: string;
  class_name: string;
  section: string;
  subject: string;
}

export function AttendanceRangeView() {
  const { user } = useAuthStore();
  const [rangeFilters, setRangeFilters] = useState<RangeFilters>({
    school_name: "",
    start_date: toIndianDate(new Date(Date.now() - 7 * 86400000)),
    end_date: toIndianDate(new Date()),
    class_name: "",
    section: "",
    subject: "",
  });
  const [queryRange, setQueryRange] = useState<RangeFilters | null>(null);

  const {
    data: rangeData,
    isLoading: rangeLoading,
    isError: rangeError,
  } = useQuery({
    queryKey: ["attendance", "range", queryRange],
    queryFn: () =>
      attendanceApi.getAttendanceRange(
        queryRange as unknown as Record<string, string>,
      ),
    enabled: !!queryRange && (user?.role !== "admin" || !!queryRange.school_name),
  });

  const lowAttendance = rangeData?.data?.filter(
    (s: AttendanceRangeStudent) => s.below_75_percent,
  );

  return (
    <Card>
      <CardHeader title="Attendance Over Date Range" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-4">
        {user?.role === "admin" && (
          <Input
            label="School Name"
            value={rangeFilters.school_name}
            onChange={(e) =>
              setRangeFilters((p) => ({ ...p, school_name: e.target.value }))
            }
            placeholder="Delhi Public School"
          />
        )}
        <Input
          label="Start Date (DD-MM-YYYY)"
          value={rangeFilters.start_date}
          onChange={(e) =>
            setRangeFilters((p) => ({ ...p, start_date: e.target.value }))
          }
        />
        <Input
          label="End Date (DD-MM-YYYY)"
          value={rangeFilters.end_date}
          onChange={(e) =>
            setRangeFilters((p) => ({ ...p, end_date: e.target.value }))
          }
        />
        <Input
          label="Class"
          value={rangeFilters.class_name}
          onChange={(e) =>
            setRangeFilters((p) => ({ ...p, class_name: e.target.value }))
          }
          placeholder="10"
        />
        <Input
          label="Section"
          value={rangeFilters.section}
          onChange={(e) =>
            setRangeFilters((p) => ({ ...p, section: e.target.value }))
          }
          placeholder="A"
        />
      </div>
      <Button
        onClick={() => setQueryRange({ ...rangeFilters })}
        icon={<Search className="h-4 w-4" />}
      >
        Search
      </Button>

      {rangeLoading && <PageSpinner />}
      {rangeError && (
        <Alert variant="error">Failed to fetch attendance range.</Alert>
      )}

      {rangeData && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-500">
            {rangeData.total_students} student(s) · {rangeData.date_range}
          </p>

          {lowAttendance && lowAttendance.length > 0 && (
            <Alert
              variant="warning"
              title={`${lowAttendance.length} student(s) below 75% attendance`}
            >
              <div className="flex flex-wrap gap-2 mt-2">
                {lowAttendance.map((s: AttendanceRangeStudent) => (
                  <Badge key={s.roll_no} variant="warning">
                    {s.name} ({s.attendance_percentage.toFixed(0)}%)
                  </Badge>
                ))}
              </div>
            </Alert>
          )}

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    %
                  </th>
                  {rangeData.dates?.map((d: string) => (
                    <th
                      key={d}
                      className="px-2 py-3 text-xs font-semibold uppercase text-gray-500 whitespace-nowrap"
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rangeData.data?.map((student: AttendanceRangeStudent) => (
                  <tr key={student.roll_no} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {student.below_75_percent && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <div>
                          <p>{student.name}</p>
                          <p className="text-xs text-gray-400">
                            #{student.roll_no}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          student.attendance_percentage >= 75
                            ? "success"
                            : "danger"
                        }
                      >
                        {student.attendance_percentage.toFixed(0)}%
                      </Badge>
                    </td>
                    {rangeData.dates?.map((d: string) => (
                      <td key={d} className="px-2 py-3 text-center">
                        <span
                          className={
                            student.dates?.[d] === "P"
                              ? "text-green-600 font-bold"
                              : "text-red-500"
                          }
                        >
                          {student.dates?.[d] ?? "—"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
