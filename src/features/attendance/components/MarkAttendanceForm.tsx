import { useAuthStore } from "@/features/auth/store/auth";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { CheckSquare, Users, UserX, Pencil, ListChecks } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  markAttendanceSchema,
  type MarkAttendanceFormData,
} from "@/features/attendance/schema";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS } from "@/features/attendance/constants";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import {
  STATUS_OPTIONS,
  statusLabel,
  statusVariant,
} from "@/features/attendance/lib/status";
import { isHolidayDate } from "@/features/attendance/lib/holidays";
import {
  cn,
  getErrorMessage,
  isoToIndianDate,
  isSunday,
} from "@/shared/lib/utils";
import { StatCard } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { Panel } from "@/shared/components/ui/Panel";
import { Avatar } from "@/shared/components/ui/Avatar";
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
  const [uploadMethod, setUploadMethod] = useState<"zip" | "photos">("zip");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
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
  const watchedSchoolName = watch("school_name");
  const watchedSession = watch("session");
  const sectionOptions = selectedClass ? getSectionOptions(selectedClass) : [];

  const holidays = useHolidayDates({
    session: watchedSession || "2025-26",
    schoolName: watchedSchoolName || undefined,
    enabled: !isAdmin || !!watchedSchoolName,
  });
  const dateIsSunday = attendanceDate ? isSunday(attendanceDate) : false;
  const dateIsHoliday = attendanceDate
    ? isHolidayDate(attendanceDate, holidays)
    : false;

  // Reset class/section whenever the selected school changes
  useEffect(() => {
    setValue("class_name", "");
    setValue("section", "");
  }, [schoolId, setValue]);

  // Reset section whenever the selected class changes
  useEffect(() => {
    setValue("section", "");
  }, [selectedClass, setValue]);

  // Reset the holiday override whenever the date is no longer a holiday
  // (Sunday or a configured school holiday).
  useEffect(() => {
    if (!dateIsHoliday) setValue("allow_holiday", false);
  }, [dateIsHoliday, setValue]);

  const handleSchoolChange = (id: string) => {
    setSchoolId(id);
    const name = schoolOptions.find((o) => o.value === id)?.label ?? "";
    setValue("school_name", name);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (
      vars:
        | { kind: "zip"; file: File; params: Record<string, string> }
        | { kind: "photos"; files: File[]; params: Record<string, string> },
    ) =>
      vars.kind === "photos"
        ? attendanceApi.markAttendancePhotos(vars.files, vars.params)
        : attendanceApi.markAttendance(vars.file, vars.params),
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
        ...(isHolidayDate(result.date, holidays) && {
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
    if (uploadMethod === "photos") {
      if (photoFiles.length === 0) {
        toast.error("Please select at least one classroom photo");
        return;
      }
    } else if (!file) {
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
      // Only admins may tune the match threshold; the server ignores it for
      // everyone else and applies the fixed platform default (0.35).
      ...(isAdmin && { threshold: String(data.threshold) }),
      ...(data.subject && { subject: data.subject }),
      ...(data.session && { session: data.session }),
      ...(data.attendance_date && {
        attendance_date: isoToIndianDate(data.attendance_date),
      }),
      ...(data.allow_holiday && { allow_holiday: "true" }),
    };
    if (uploadMethod === "photos") {
      mutate({ kind: "photos", files: photoFiles, params });
    } else if (file) {
      mutate({ kind: "zip", file, params });
    }
  };

  const allRecords = result
    ? [...result.present_students, ...result.absent_students].sort((a, b) =>
        a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true }),
      )
    : [];

  const attendancePct =
    result && result.total_enrolled > 0
      ? Math.round((result.present_count / result.total_enrolled) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 gap-6 ${result ? "lg:grid-cols-2" : ""}`}>
        <Panel>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class &amp; session
              </p>
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
              <Controller
                control={control}
                name="attendance_date"
                render={({ field }) => (
                  <DatePicker
                    label="Date"
                    max={todayIso()}
                    value={field.value}
                    onChange={(iso) => field.onChange(iso ?? todayIso())}
                    error={errors.attendance_date?.message}
                    fadeSundays
                    holidays={holidays}
                  />
                )}
              />
              {/* Face-match threshold is an admin-only tuning knob. Non-admin
                  staff run at the fixed platform default enforced by the server. */}
              {isAdmin && (
                <div className="col-span-2 flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/30 p-3">
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
                          min={0.35}
                          max={0.9}
                          step={0.05}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                          className="flex-1 accent-primary"
                        />
                        <span className="w-12 rounded-md bg-background px-2 py-0.5 text-center text-sm font-semibold text-foreground tabular-nums">
                          {field.value.toFixed(2)}
                        </span>
                      </div>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher = stricter matching. The server enforces a minimum of
                    0.35 regardless of the value sent.
                  </p>
                </div>
              )}
              </div>
            </div>

            {dateIsHoliday && (
              <Alert
                variant="warning"
                title={
                  dateIsSunday
                    ? "This date is a Sunday"
                    : "This date is a school holiday"
                }
              >
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

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Classroom photos
              </p>
              <div className="inline-flex w-fit rounded-lg border border-border/70 bg-muted/40 p-0.5">
              {(
                [
                  { value: "zip", label: "ZIP Archive" },
                  { value: "photos", label: "Direct Photos" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUploadMethod(opt.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                    uploadMethod === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {uploadMethod === "photos" ? (
              <FileUpload
                key="photos"
                label="Classroom Photos"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                multiple
                maxSize={15 * 1024 * 1024}
                onChange={setPhotoFiles}
                hint="Select multiple photos taken of the class. Any filenames are fine — matching is by face, not name. Max 15 MB each."
              />
            ) : (
              <FileUpload
                key="zip"
                label="Classroom Photos ZIP"
                accept=".zip,application/zip,application/x-zip-compressed"
                maxSize={50 * 1024 * 1024}
                onChange={(files) => setFile(files[0] || null)}
                hint="Upload a single ZIP archive containing classroom photos (.zip format). Max 50 MB."
              />
            )}
            </div>

            <Button
              type="submit"
              loading={isPending}
              className="self-start"
              icon={<CheckSquare className="h-4 w-4" />}
            >
              {isPending ? "Processing…" : "Mark Attendance"}
            </Button>
          </form>
        </Panel>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Present"
                value={result.present_count}
                icon={<Users className="h-5 w-5" />}
                color="success"
              />
              <StatCard
                label="Absent"
                value={result.absent_count}
                icon={<UserX className="h-5 w-5" />}
                color="danger"
              />
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{result.school_name}</Badge>
                <Badge>
                  Class {result.class_name}-{result.section}
                </Badge>
                <Badge>
                  {result.date} · {result.time}
                </Badge>
                <Badge variant="primary">{attendancePct}% attendance</Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      {result && (
        <Panel
          flush
          icon={<ListChecks className="h-4 w-4" />}
          title={`Attendance record · ${result.date}`}
          description={`${result.total_enrolled} enrolled · ${result.present_count} present · ${result.absent_count} absent`}
        >
          <div className="border-b border-border/50 px-4 py-3 md:px-5">
            <p className="text-xs text-muted-foreground">
              Counts reflect automatic face-recognition results. Use the dropdown
              in each row to correct an individual student's status.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/50">
              <thead className="bg-muted/50">
                <tr>
                  {(isAdmin
                    ? ["Student", "Confidence", "Status"]
                    : ["Student", "Status"]
                  ).map((h) => (
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
                      colSpan={isAdmin ? 3 : 2}
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.name ?? r.roll_no} seed={r.roll_no} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {r.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Roll #{r.roll_no}
                            </p>
                          </div>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-foreground tabular-nums">
                          {r.similarity != null
                            ? `${(r.similarity * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                      )}
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
        </Panel>
      )}
    </div>
  );
}
