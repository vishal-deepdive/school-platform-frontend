import { useAuthStore } from "@/features/auth/store/auth";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download } from "lucide-react";
import { toIndianDate, downloadBlob } from "@/shared/lib/utils";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { Alert } from "@/shared/components/ui/Alert";

interface DateFilters {
  school_name: string;
  date: string;
  class_name: string;
  section: string;
  subject: string;
}

type AttendanceRow = Record<string, unknown>;

export function AttendanceDateView() {
  const { user } = useAuthStore();
  const [dateFilters, setDateFilters] = useState<DateFilters>({
    school_name: "",
    date: toIndianDate(new Date()),
    class_name: "",
    section: "",
    subject: "",
  });
  const [queryDate, setQueryDate] = useState<DateFilters | null>(null);

  const {
    data: dateData,
    isLoading: dateLoading,
    isError: dateError,
  } = useQuery({
    queryKey: ["attendance", "date", queryDate],
    queryFn: () =>
      attendanceApi.getAttendanceOnDate(
        queryDate as unknown as Record<string, string>,
      ),
    enabled: !!queryDate && (user?.role !== "admin" || !!queryDate.school_name),
  });

  const handleExportCSV = async () => {
    if (!queryDate || (user?.role === "admin" && !queryDate.school_name)) return;
    const blob = await attendanceApi.exportAttendanceOnDate(
      queryDate as unknown as Record<string, string>,
    );
    downloadBlob(blob, `attendance-${queryDate.date}.csv`);
  };

  return (
    <Card>
      <CardHeader title="Attendance on a Date" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-4">
        {user?.role === "admin" && (
          <Input
            label="School Name"
            value={dateFilters.school_name}
            onChange={(e) =>
              setDateFilters((p) => ({ ...p, school_name: e.target.value }))
            }
            placeholder="Delhi Public School"
          />
        )}
        <Input
          label="Date (DD-MM-YYYY)"
          value={dateFilters.date}
          onChange={(e) =>
            setDateFilters((p) => ({ ...p, date: e.target.value }))
          }
          placeholder="15-08-2025"
        />
        <Input
          label="Class"
          value={dateFilters.class_name}
          onChange={(e) =>
            setDateFilters((p) => ({ ...p, class_name: e.target.value }))
          }
          placeholder="10"
        />
        <Input
          label="Section"
          value={dateFilters.section}
          onChange={(e) =>
            setDateFilters((p) => ({ ...p, section: e.target.value }))
          }
          placeholder="A"
        />
        <Input
          label="Subject (optional)"
          value={dateFilters.subject}
          onChange={(e) =>
            setDateFilters((p) => ({ ...p, subject: e.target.value }))
          }
          placeholder="Mathematics"
        />
      </div>
      <div className="flex gap-3">
        <Button
          onClick={() => setQueryDate({ ...dateFilters })}
          icon={<Search className="h-4 w-4" />}
        >
          Search
        </Button>
        <Button
          variant="outline"
          onClick={handleExportCSV}
          icon={<Download className="h-4 w-4" />}
        >
          Export CSV
        </Button>
      </div>

      {dateLoading && <PageSpinner />}
      {dateError && (
        <Alert variant="error">Failed to fetch attendance records.</Alert>
      )}
      {dateData && (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground mb-3">
            {dateData.total_records} record(s) on {dateData.date}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Roll No",
                    "Name",
                    "Class",
                    "Section",
                    "Subject",
                    "Status",
                    "Time",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {(dateData.data as AttendanceRow[]).map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      {String(row.roll_number ?? row.roll_no ?? "—")}
                    </td>
                    <td className="px-4 py-3">{String(row.name ?? "—")}</td>
                    <td className="px-4 py-3">
                      {String(row.class_name ?? row.class ?? "—")}
                    </td>
                    <td className="px-4 py-3">{String(row.section ?? "—")}</td>
                    <td className="px-4 py-3">{String(row.subject ?? "—")}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          row.attendance_record === "P" ? "success" : "danger"
                        }
                      >
                        {row.attendance_record === "P" ? "Present" : "Absent"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{String(row.time ?? "—")}</td>
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
