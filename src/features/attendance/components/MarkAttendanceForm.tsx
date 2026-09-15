import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { CheckSquare, ListChecks, Pencil, UserCog, UserX, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "@/shared/lib/toast";
import {
  markAttendanceSchema,
  type MarkAttendanceFormData,
} from "@/features/attendance/schema";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS, getCurrentSession } from "@/features/attendance/constants";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { ClassSelect, SectionSelect } from "@/shared/components/ui/ClassSelect";
import { useHolidayDates } from "@/shared/hooks/useHolidayDates";
import {
  STATUS_OPTIONS,
  statusLabel,
  statusVariant,
} from "@/features/attendance/lib/status";
import { isHolidayDate } from "@/features/attendance/lib/holidays";
import { getErrorMessage, isoToIndianDate, isSunday } from "@/shared/lib/utils";
import { ActionMenu } from "@/shared/components/ui/ActionMenu";
import { Alert } from "@/shared/components/ui/Alert";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { DatePicker } from "@/shared/components/ui/DatePicker";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { FormActions } from "@/shared/components/ui/FormActions";
import { FormSection } from "@/shared/components/ui/FormSection";
import { Input } from "@/shared/components/ui/Input";
import { KpiStrip, type KpiItem } from "@/shared/components/ui/KpiStrip";
import { Panel } from "@/shared/components/ui/Panel";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import { Select } from "@/shared/components/ui/Select";
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

type UploadMethod = "zip" | "photos";

function updateRecordStatus(
  result: MarkAttendanceResponse,
  rollNo: string,
  status: AttendanceStatus,
): MarkAttendanceResponse {
  // There are only two summary buckets (matching the backend's own bucketing:
  // face-matched -> present_students/"P", unmatched -> absent_students/"A").
  // A correction can set any of P/L/E/H, all of which count as "present" for
  // this summary — only "A" belongs in the absent bucket. Patching the status
  // in place without moving the record between arrays left the counts stale
  // the moment a correction changed which bucket a student belonged in.
  const existing =
    result.present_students.find((r) => r.roll_no === rollNo) ??
    result.absent_students.find((r) => r.roll_no === rollNo);
  if (!existing) return result;

  const updated: AttendanceRecord = { ...existing, status };
  const withoutRecord = (records: AttendanceRecord[]) =>
    records.filter((r) => r.roll_no !== rollNo);

  const present_students = withoutRecord(result.present_students);
  const absent_students = withoutRecord(result.absent_students);
  if (status === "A") absent_students.push(updated);
  else present_students.push(updated);

  return {
    ...result,
    present_students,
    absent_students,
    present_count: present_students.length,
    absent_count: absent_students.length,
  };
}

export function MarkAttendanceForm() {
  const { schoolId, schoolName, isAdmin } = useActiveSchool();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>("zip");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [result, setResult] = useState<MarkAttendanceResponse | null>(null);
  const [correctingRoll, setCorrectingRoll] = useState<string | null>(null);

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
      session: getCurrentSession(),
      class_name: "",
      section: "",
      attendance_date: todayIso(),
      allow_holiday: false,
    },
  });

  const selectedClass = watch("class_name");
  const attendanceDate = watch("attendance_date");
  const watchedSection = watch("section");
  const watchedSession = watch("session");

  const holidays = useHolidayDates({
    session: watchedSession || getCurrentSession(),
    schoolName: schoolName || undefined,
    enabled: !isAdmin || !!schoolName,
  });
  const dateIsSunday = attendanceDate ? isSunday(attendanceDate) : false;
  const dateIsHoliday = attendanceDate ? isHolidayDate(attendanceDate, holidays) : false;

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
        `Attendance marked: ${data.present_count} present, ${data.absent_count} absent` +
          (data.not_enrolled_count
            ? `, ${data.not_enrolled_count} with no face on file`
            : ""),
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
        ...(isHolidayDate(result.date, holidays) && { allow_holiday: "true" }),
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
        toast.error("Choose at least one classroom photo");
        return;
      }
    } else if (!file) {
      toast.error("Choose a ZIP archive of classroom photos");
      return;
    }
    if (isAdmin && !schoolName) {
      toast.error("Select a school first");
      return;
    }
    const params: Record<string, string> = {
      school_name: schoolName || "",
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

  const selectedCount = uploadMethod === "photos" ? photoFiles.length : file ? 1 : 0;
  const formId = "mark-attendance-form";

  // Step state drives the numbered badges and the bar's completion line.
  const classStepDone = Boolean(selectedClass && watchedSection && attendanceDate);
  const photoStepDone = selectedCount > 0;
  const stepsDone = [classStepDone, photoStepDone].filter(Boolean).length;

  const resultKpis: KpiItem[] = result
    ? [
        {
          label: "Present",
          value: result.present_count,
          icon: <Users />,
          tone: "success",
          hint: `${attendancePct}% of ${result.total_enrolled} enrolled`,
        },
        { label: "Absent", value: result.absent_count, icon: <UserX />, tone: "danger" },
        ...(result.not_enrolled_count > 0
          ? [
              {
                label: "No face on file",
                value: result.not_enrolled_count,
                icon: <UserCog />,
                tone: "warning" as const,
                hint: "Not assessed — mark manually",
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className={result ? "grid gap-4 lg:grid-cols-2" : ""}>
        <Panel>
          <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <FormSection
              step={1}
              complete={classStepDone}
              title="Which class and date?"
              description="Face matches are recorded against this class, section and date."
            >
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <ClassSelect
                  value={selectedClass}
                  onChange={(value) => {
                    setValue("class_name", value, { shouldValidate: true });
                    setValue("section", "", { shouldValidate: true });
                  }}
                  disabled={!schoolId}
                  error={errors.class_name?.message}
                />
                <SectionSelect
                  className_={selectedClass}
                  value={watchedSection ?? ""}
                  onChange={(value) => setValue("section", value, { shouldValidate: true })}
                  error={errors.section?.message}
                  allowFreeText
                />
                <Input
                  label="Subject (optional)"
                  placeholder="Mathematics"
                  {...register("subject")}
                />
                <Select label="Session" options={SESSION_OPTIONS} {...register("session")} />
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
              </div>

              {dateIsHoliday && (
                <Alert
                  className="mt-4"
                  variant="warning"
                  title={
                    dateIsSunday ? "This date is a Sunday" : "This date is a school holiday"
                  }
                >
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      {...register("allow_holiday")}
                    />
                    Mark attendance anyway (holiday override)
                  </label>
                </Alert>
              )}
            </FormSection>

            <FormSection
              step={2}
              complete={photoStepDone}
              title="Classroom photos"
              description="Everyone recognised is marked present; everyone else is marked absent for you to review."
              action={
                <SegmentedControl
                  aria-label="Upload method"
                  value={uploadMethod}
                  onChange={setUploadMethod}
                  options={[
                    { value: "zip", label: "ZIP archive" },
                    { value: "photos", label: "Photos" },
                  ]}
                />
              }
            >
              {uploadMethod === "photos" ? (
                <FileUpload
                  key="photos"
                  label="Classroom photos"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  multiple
                  maxSize={15 * 1024 * 1024}
                  onChange={setPhotoFiles}
                  hint="Any filenames are fine — students are matched by face, not name. Max 15 MB each."
                />
              ) : (
                <FileUpload
                  key="zip"
                  label="Classroom photos (ZIP)"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  maxSize={50 * 1024 * 1024}
                  onChange={(files) => setFile(files[0] || null)}
                  hint="One ZIP archive of the photos you took of the class. Max 50 MB."
                />
              )}
            </FormSection>

            {/* Admin-only tuning knob; other staff run at the server default. */}
            {isAdmin && (
              <FormSection
                step={3}
                complete
                title="Match threshold"
                optional
                description="Higher is stricter. The server enforces a minimum of 0.35 whatever is sent."
              >
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
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        className="flex-1 accent-primary"
                        aria-label="Similarity threshold"
                      />
                      <span className="w-12 rounded-md border border-border/60 bg-background px-2 py-0.5 text-center text-sm font-semibold tabular-nums text-foreground">
                        {field.value.toFixed(2)}
                      </span>
                    </div>
                  )}
                />
              </FormSection>
            )}
          </form>
        </Panel>

        {result && (
          <div className="space-y-4">
            <KpiStrip items={resultKpis} />

            <div className="flex flex-wrap items-center gap-2">
              {result.school_name && <Badge variant="info">{result.school_name}</Badge>}
              <Badge>
                Class {result.class_name}-{result.section}
              </Badge>
              <Badge>
                {result.date} · {result.time}
              </Badge>
            </div>

            {result.not_enrolled_count > 0 && (
              <Alert
                variant="warning"
                title={`${result.not_enrolled_count} student(s) weren't assessed — no face on file`}
              >
                <p className="text-xs">
                  Face recognition cannot tell whether they were there. Mark them below, or{" "}
                  <Link to="/attendance/enroll" className="font-medium underline">
                    enroll their face
                  </Link>{" "}
                  for next time.
                </p>
                <ul className="mt-2 max-h-32 space-y-0.5 overflow-auto text-xs">
                  {result.not_enrolled_students.map((s) => (
                    <li key={s.roll_no}>
                      <span className="font-medium">{s.name}</span> · #{s.roll_no}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {result.ambiguous_count > 0 && (
              <Alert
                variant="warning"
                title={`${result.ambiguous_count} face(s) were too uncertain to mark`}
              >
                <p className="text-xs">
                  Two students looked similar enough that we could not safely tell them apart —
                  neither was marked. Check them below.
                </p>
                <ul className="mt-2 max-h-32 space-y-0.5 overflow-auto text-xs">
                  {result.ambiguous_faces.map((a, i) => (
                    <li key={i}>
                      {a.candidates
                        .map(
                          (c) =>
                            `${c.name} (#${c.roll_no}, ${(c.similarity * 100).toFixed(0)}%)`,
                        )
                        .join(" vs. ")}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        )}
      </div>

      <FormActions
        progress={result ? undefined : { done: stepsDone, total: 2 }}
        info={
          result
            ? "Marked. Correct any individual student in the record below."
            : !classStepDone
              ? "Step 1 — pick the class, section and date."
              : !photoStepDone
                ? "Step 2 — add the classroom photos."
                : `Ready: ${selectedCount} ${uploadMethod === "photos" ? (selectedCount === 1 ? "photo" : "photos") : "archive"} for ${selectedClass}-${watchedSection}.`
        }
      >
        <Button
          type="submit"
          form={formId}
          loading={isPending}
          disabled={selectedCount === 0}
          icon={<CheckSquare className="h-4 w-4" />}
        >
          {isPending ? "Processing…" : "Mark attendance"}
        </Button>
      </FormActions>

      {result && (
        <Panel
          flush
          icon={<ListChecks className="h-4 w-4" />}
          title={`Attendance record · ${result.date}`}
          description={
            `${result.total_enrolled} enrolled · ${result.present_count} present · ${result.absent_count} absent` +
            (result.not_enrolled_count ? ` · ${result.not_enrolled_count} no face on file` : "") +
            (result.ambiguous_count ? ` · ${result.ambiguous_count} uncertain` : "")
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/50">
              <thead className="bg-muted/50">
                <tr>
                  {(isAdmin
                    ? ["Student", "Confidence", "Status", ""]
                    : ["Student", "Status", ""]
                  ).map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h || <span className="sr-only">Correct</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 bg-background">
                {allRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 4 : 3}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  allRecords.map((r) => (
                    <tr key={r.roll_no} className="transition-colors hover:bg-accent/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.name ?? r.roll_no} seed={r.roll_no} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {r.name}
                            </p>
                            <p className="text-xs text-muted-foreground">Roll #{r.roll_no}</p>
                          </div>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm tabular-nums text-foreground">
                          {r.similarity != null ? `${(r.similarity * 100).toFixed(1)}%` : "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Badge variant={statusVariant(r.status)}>
                            {statusLabel(r.status)}
                          </Badge>
                          {correctingRoll === r.roll_no && (
                            <Pencil className="h-3 w-3 animate-pulse text-muted-foreground" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          label={`Correct status for ${r.name ?? r.roll_no}`}
                          items={STATUS_OPTIONS.map((o) => ({
                            label: `Mark ${o.label.toLowerCase()}`,
                            disabled: correctingRoll === r.roll_no || o.value === r.status,
                            onSelect: () =>
                              correctMutation.mutate({
                                roll_no: r.roll_no,
                                status: o.value as AttendanceStatus,
                              }),
                          }))}
                        />
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
