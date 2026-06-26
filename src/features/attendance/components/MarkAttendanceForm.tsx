import { useAuthStore } from "@/features/auth/store/auth";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckSquare, Users, UserX, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import {
  markAttendanceSchema,
  type MarkAttendanceFormData,
} from "@/features/attendance/schema";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import {
  STATUS_OPTIONS,
  statusLabel,
  statusVariant,
} from "@/features/attendance/lib/status";
import {
  getErrorMessage,
  isoToIndianDate,
  isSunday,
} from "@/shared/lib/utils";
import { Card, CardHeader, StatCard } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import type {
  MarkAttendanceResponse,
  AttendanceRecord,
  AttendanceStatus,
} from "@/features/attendance/types";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function updateRecordStatus(
  result: MarkAttendanceResponse,
  rollNo: string,
  status: AttendanceStatus,
): MarkAttendanceResponse {
  const apply = (records: AttendanceRecord[]) =>
    records.map((r) => (r.roll_no === rollNo ? { ...r, status } : r));
  return {
    ...result,
    present_students: apply(result.present_students),
    absent_students: apply(result.absent_students),
  };
}

export function MarkAttendanceForm() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<MarkAttendanceResponse | null>(null);
  const [schoolId, setSchoolId] = useState<string | undefined>(
    isAdmin ? undefined : user?.school_id ?? undefined,
  );
  const [correctingRoll, setCorrectingRoll] = useState<string | null>(null);

  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isSearching: schoolsLoading,
  } = useSchoolSearch();
  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MarkAttendanceFormData>({
    resolver: zodResolver(markAttendanceSchema),
    defaultValues: {
      threshold: 0.4,
      session: "2025-26",
      school_name: "",
      class_name: "",
      section: "",
      attendance_date: todayIso(),
      allow_holiday: false,
    },
  });

  const selectedClass = watch("class_name");
  const attendanceDate = watch("attendance_date");
  const sectionOptions = selectedClass ? getSectionOptions(selectedClass) : [];
  const dateIsSunday = attendanceDate ? isSunday(attendanceDate) : false;

  // Reset class/section whenever the selected school changes
  useEffect(() => {
    setValue("class_name", "");
    setValue("section", "");
  }, [schoolId, setValue]);

  // Reset section whenever the selected class changes
  useEffect(() => {
    setValue("section", "");
  }, [selectedClass, setValue]);

  // Reset the holiday override whenever the date no longer falls on a Sunday
  useEffect(() => {
    if (!dateIsSunday) setValue("allow_holiday", false);
  }, [dateIsSunday, setValue]);

  const handleSchoolChange = (id: string) => {
    setSchoolId(id);
    const name = schoolOptions.find((o) => o.value === id)?.label ?? "";
    setValue("school_name", name);
  };

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
      // Views and stats may now be stale after marking attendance.
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(
        `Attendance marked: ${data.present_count} present, ${data.absent_count} absent`,
      );
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const correctMutation = useMutation({
    mutationFn: (vars: { roll_no: string; status: AttendanceStatus }) => {
      if (!result) return Promise.reject(new Error("No attendance result"));
      // result.date is YYYY-MM-DD; the /correct endpoint requires DD-MM-YYYY.
      const params: Record<string, string> = {
        class_name: result.class_name,
        section: result.section,
        roll_no: vars.roll_no,
        status: vars.status,
        session: result.session,
        attendance_date: isoToIndianDate(result.date),
        ...(result.school_name && { school_name: result.school_name }),
        ...(result.subject && { subject: result.subject }),
        ...(isSunday(result.date) && {
          allow_holiday: "true",
        }),
      };
      return attendanceApi.correctAttendance(params);
    },
    onMutate: (vars) => setCorrectingRoll(vars.roll_no),
    onSuccess: (data) => {
      setResult((prev) =>
        prev ? updateRecordStatus(prev, data.roll_no, data.status) : prev,
      );
      // A correction changes the stored record; refresh date/range/stats views.
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(`${data.name ?? data.roll_no}: marked ${statusLabel(data.status)}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => setCorrectingRoll(null),
  });

  const onSubmit = (data: MarkAttendanceFormData) => {
    if (!file) {
      toast.error("Please upload a ZIP archive of classroom photos");
      return;
    }
    if (isAdmin && !data.school_name) {
      toast.error("Please select a school");
      return;
    }
    const params: Record<string, string> = {
      school_name: data.school_name || "",
      class_name: data.class_name,
      section: data.section,
      threshold: String(data.threshold),
      ...(data.subject && { subject: data.subject }),
      ...(data.session && { session: data.session }),
      ...(data.attendance_date && {
        attendance_date: isoToIndianDate(data.attendance_date),
      }),
      ...(data.allow_holiday && { allow_holiday: "true" }),
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
            <div className="grid grid-cols-2 gap-4 items-start">
              {isAdmin && (
                <SearchableSelect
                  label="School"
                  placeholder="Select school..."
                  options={schoolOptions}
                  value={schoolId}
                  onChange={handleSchoolChange}
                  onSearchChange={setSchoolQuery}
                  isLoading={schoolsLoading}
                />
              )}
              <Select
                label="Class"
                placeholder={
                  schoolId ? "Select class" : "Select a school first"
                }
                options={classNameOptions}
                error={errors.class_name?.message}
                disabled={!schoolId}
                {...register("class_name")}
              />
              {sectionOptions.length > 0 ? (
                <Select
                  label="Section"
                  placeholder="Select section"
                  options={sectionOptions}
                  error={errors.section?.message}
                  {...register("section")}
                />
              ) : (
                <Input
                  label="Section"
                  placeholder="A"
                  error={errors.section?.message}
                  {...register("section")}
                />
              )}
              <Input
                label="Subject (optional)"
                placeholder="Mathematics"
                {...register("subject")}
              />
              <Select
                label="Session"
                options={SESSION_OPTIONS}
                {...register("session")}
              />
              <Input
                type="date"
                label="Date"
                max={todayIso()}
                error={errors.attendance_date?.message}
                {...register("attendance_date")}
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

            {dateIsSunday && (
              <Alert variant="warning" title="This date is a Sunday">
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    {...register("allow_holiday")}
                  />
                  Mark attendance anyway (holiday override)
                </label>
              </Alert>
            )}

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
            <p className="text-xs text-muted-foreground mt-1">
              Counts reflect automatic face-recognition results. Use the
              dropdown in each row to correct an individual student's status
              (Present / Absent / Late / Excused / Half Day).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/50">
              <thead className="bg-muted/50">
                <tr>
                  {["Roll No", "Name", "Confidence", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 bg-background">
                {allRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  allRecords.map((r) => (
                    <tr
                      key={r.roll_no}
                      className="hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-foreground">
                        {r.roll_no}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {r.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {r.similarity != null
                          ? `${(r.similarity * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant(r.status)}>
                            {statusLabel(r.status)}
                          </Badge>
                          <select
                            value={r.status}
                            disabled={correctingRoll === r.roll_no}
                            onChange={(e) =>
                              correctMutation.mutate({
                                roll_no: r.roll_no,
                                status: e.target.value as AttendanceStatus,
                              })
                            }
                            className="rounded-md border border-input bg-background px-1.5 py-1 text-xs text-foreground disabled:opacity-50"
                            aria-label={`Correct status for ${r.roll_no}`}
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {correctingRoll === r.roll_no && (
                            <Pencil className="h-3 w-3 animate-pulse text-muted-foreground" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
