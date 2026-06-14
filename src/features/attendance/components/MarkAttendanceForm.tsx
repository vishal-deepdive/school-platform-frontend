import { useAuthStore } from "@/features/auth/store/auth";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckSquare, Users, UserX } from "lucide-react";
import toast from "react-hot-toast";
import {
  markAttendanceSchema,
  type MarkAttendanceFormData,
} from "@/features/attendance/schema";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card, CardHeader, StatCard } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Badge } from "@/shared/components/ui/Badge";
import { Table } from "@/shared/components/ui/Table";
import type {
  MarkAttendanceResponse,
  AttendanceRecord,
} from "@/features/attendance/types";

const attendanceCols = [
  { key: "roll_no", header: "Roll No" },
  { key: "name", header: "Name" },
  {
    key: "similarity",
    header: "Confidence",
    render: (r: AttendanceRecord) =>
      r.similarity != null ? `${(r.similarity * 100).toFixed(1)}%` : "—",
  },
  {
    key: "status",
    header: "Status",
    render: (r: AttendanceRecord) => (
      <Badge variant={r.status === "P" ? "success" : "danger"}>
        {r.status === "P" ? "Present" : "Absent"}
      </Badge>
    ),
  },
];

export function MarkAttendanceForm() {
  const { user } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<MarkAttendanceResponse | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MarkAttendanceFormData>({
    resolver: zodResolver(markAttendanceSchema),
    defaultValues: { threshold: 0.4, session: "2025-26" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: ({
      file: f,
      params,
    }: {
      file: File;
      params: Record<string, string>;
    }) => attendanceApi.markAttendance(f, params),
    onSuccess: (data) => {
      setResult(data);
      toast.success(
        `Attendance marked: ${data.present_count} present, ${data.absent_count} absent`,
      );
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onSubmit = (data: MarkAttendanceFormData) => {
    if (!file) {
      toast.error("Please upload a ZIP archive of classroom photos");
      return;
    }
    const params: Record<string, string> = {
      school_name: data.school_name || "",
      class_name: data.class_name,
      section: data.section,
      threshold: String(data.threshold),
      ...(data.subject && { subject: data.subject }),
      ...(data.session && { session: data.session }),
    };
    mutate({ file, params });
  };

  const allRecords = result
    ? [...result.present_students, ...result.absent_students].sort((a, b) =>
        a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true }),
      )
    : [];

  return (
    <>
      <div className={`grid grid-cols-1 gap-6 ${result ? "lg:grid-cols-2" : ""}`}>
        <Card>
          <CardHeader title="Session Details" />
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-4">
              {user?.role === "admin" && (
                <Input
                  label="School Name"
                  placeholder="Delhi Public School"
                  error={errors.school_name?.message}
                  {...register("school_name")}
                />
              )}
              <Input
                label="Class"
                placeholder="10"
                error={errors.class_name?.message}
                {...register("class_name")}
              />
              <Input
                label="Section"
                placeholder="A"
                error={errors.section?.message}
                {...register("section")}
              />
              <Input
                label="Subject (optional)"
                placeholder="Mathematics"
                {...register("subject")}
              />
              <Input
                label="Session"
                placeholder="2025-26"
                {...register("session")}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">
                  Similarity Threshold
                </label>
                <Controller
                  control={control}
                  name="threshold"
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0.1}
                        max={0.9}
                        step={0.05}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                        className="flex-1"
                      />
                      <span className="w-12 text-sm font-medium text-foreground">
                        {field.value.toFixed(2)}
                      </span>
                    </div>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Higher = stricter matching
                </p>
              </div>
            </div>

            <FileUpload
              label="Classroom Photos ZIP"
              accept=".zip,application/zip,application/x-zip-compressed"
              maxSize={50 * 1024 * 1024}
              onChange={(files) => setFile(files[0] || null)}
              hint="Upload a single ZIP archive containing classroom photos (.zip format). Max 50 MB."
            />

            <Button
              type="submit"
              loading={isPending}
              icon={<CheckSquare className="h-4 w-4" />}
            >
              {isPending ? "Processing…" : "Mark Attendance"}
            </Button>
          </form>
        </Card>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Present"
                value={result.present_count}
                icon={<Users className="h-5 w-5" />}
                color="green"
              />
              <StatCard
                label="Absent"
                value={result.absent_count}
                icon={<UserX className="h-5 w-5" />}
                color="red"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge variant="info">{result.school_name}</Badge>
              <Badge>
                Class {result.class_name}-{result.section}
              </Badge>
              <Badge>
                {result.date} · {result.time}
              </Badge>
              <Badge variant="default">
                {result.total_enrolled > 0
                  ? Math.round(
                      (result.present_count / result.total_enrolled) * 100,
                    )
                  : 0}
                % attendance
              </Badge>
            </div>
          </div>
        )}
      </div>

      {result && (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">
              Attendance Record — {result.date}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {result.total_enrolled} enrolled · {result.present_count} present
              · {result.absent_count} absent
            </p>
          </div>
          <Table
            columns={
              attendanceCols as Parameters<
                typeof Table<Record<string, unknown>>
              >[0]["columns"]
            }
            data={allRecords as unknown as Record<string, unknown>[]}
            emptyMessage="No attendance records found."
          />
        </Card>
      )}
    </>
  );
}
