import { useAuthStore } from "@/features/auth/store/auth";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, CalendarX } from "lucide-react";
import { toIndianDate, downloadBlob, getErrorMessage } from "@/shared/lib/utils";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Table } from "@/shared/components/ui/Table";
import type { Column } from "@/shared/components/ui/Table";
import { statusLabel, statusVariant } from "@/features/attendance/lib/status";

interface DateFilters {
  school_name: string;
  date: string;
  class_name: string;
  section: string;
  subject: string;
}

type AttendanceRow = Record<string, unknown>;

const DATE_COLUMNS: Column<AttendanceRow>[] = [
  { key: "roll_number", header: "Roll No", render: (row) => String(row.roll_number ?? row.roll_no ?? "—") },
  { key: "name", header: "Name", render: (row) => String(row.name ?? "—") },
  { key: "class_name", header: "Class", render: (row) => String(row.class_name ?? row.class ?? "—") },
  { key: "section", header: "Section", render: (row) => String(row.section ?? "—") },
  { key: "subject", header: "Subject", render: (row) => String(row.subject ?? "—") },
  {
    key: "attendance_record",
    header: "Status",
    render: (row) => (
      <Badge variant={statusVariant(String(row.attendance_record))}>
        {statusLabel(String(row.attendance_record))}
      </Badge>
    ),
  },
  { key: "time", header: "Time", render: (row) => String(row.time ?? "—") },
];

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
    error: dateQueryError,
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
        <Alert variant="error">{getErrorMessage(dateQueryError) || "Failed to fetch attendance records."}</Alert>
      )}
      {dateData && (dateData.data as AttendanceRow[]).length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<CalendarX className="h-10 w-10" />}
            title="No records for this date"
            description="No attendance has been marked for the selected class, section, and date. Try a different date or mark attendance first."
          />
        </div>
      )}

      {dateData && (dateData.data as AttendanceRow[]).length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground mb-3">
            {dateData.total_records} record(s) on {dateData.date}
          </p>
          <Table columns={DATE_COLUMNS} data={dateData.data as AttendanceRow[]} />
        </div>
      )}
    </Card>
  );
}
