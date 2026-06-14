import { useAuthStore } from "@/features/auth/store/auth";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  enrollSchema,
  type EnrollFormData,
} from "@/features/attendance/schema";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Tabs } from "@/shared/components/ui/Tabs";
import type { EnrollResponse } from "@/features/attendance/types";

const enrollModes = [
  { id: "new", label: "New Batch" },
  { id: "single", label: "Single Student" },
  { id: "replace", label: "Batch with Replacement" },
];

const sessionOptions = ["2023-24", "2024-25", "2025-26", "2026-27"].map(
  (s) => ({
    value: s,
    label: s,
  }),
);

export function EnrollPage() {
  const { user } = useAuthStore();
  const [mode, setMode] = useState("new");
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<EnrollResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EnrollFormData>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { session: "2025-26" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: ({
      file,
      params,
    }: {
      file: File;
      params: Record<string, string>;
    }) => {
      if (mode === "single")
        return attendanceApi.enrollNewStudent(file, params);
      if (mode === "replace")
        return attendanceApi.enrollWithReplacement(file, params);
      return attendanceApi.enroll(file, params);
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Enrolled ${data.enrolled_students.length} student(s)`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onSubmit = (data: EnrollFormData) => {
    if (!files[0]) {
      toast.error("Please select a ZIP file");
      return;
    }
    const params: Record<string, string> = {
      school_name: data.school_name || "",
      session: data.session,
      ...(data.class_name && { class_name: data.class_name }),
      ...(data.section && { section: data.section }),
      ...(data.subject && { subject: data.subject }),
    };
    mutate({ file: files[0], params });
  };

  return (
    <div className="space-y-6 w-full">
      <Tabs
        tabs={enrollModes}
        active={mode}
        onChange={(id) => {
          setMode(id);
          setResult(null);
        }}
      />

      <div className={`grid grid-cols-1 gap-6 ${result ? "lg:grid-cols-2" : ""}`}>
        <Card>
          <CardHeader
            title={
              mode === "new"
                ? "New Batch Enrollment"
                : mode === "single"
                  ? "Enroll Single Student"
                  : "Batch Enrollment with Replacement"
            }
            description="ZIP structure: each student in a subfolder named roll_no_student_name (e.g. 101_Priya_Sharma)"
          />

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {user?.role === "admin" && (
                <Input
                  label="School Name"
                  placeholder="Delhi Public School"
                  error={errors.school_name?.message}
                  {...register("school_name")}
                />
              )}
              <Select
                label="Session"
                options={sessionOptions}
                error={errors.session?.message}
                {...register("session")}
              />
              <Input
                label="Class (optional)"
                placeholder="10A"
                {...register("class_name")}
              />
              <Input
                label="Section (optional)"
                placeholder="A"
                {...register("section")}
              />
              <Input
                label="Subject (optional)"
                placeholder="Mathematics"
                {...register("subject")}
              />
            </div>

            <FileUpload
              label="Student ZIP File"
              accept=".zip"
              maxSize={100 * 1024 * 1024}
              onChange={setFiles}
              hint="Max 100 MB. Each student's folder should contain 3-5 clear face photos."
            />

            <Button
              type="submit"
              loading={isPending}
              icon={<UserPlus className="h-4 w-4" />}
            >
              {isPending ? "Enrolling…" : "Enroll Students"}
            </Button>
          </form>
        </Card>

        {result && (
          <div className="space-y-4">
            {result.enrolled_students.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
                  <h3 className="font-semibold text-foreground">
                    {result.enrolled_students.length} Student(s) Enrolled
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.enrolled_students.map((s) => (
                    <div
                      key={s.roll_no}
                      className="rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 px-3 py-1.5"
                    >
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        {s.name}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        #{s.roll_no} · {s.images_processed} photos
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {result.skipped && result.skipped.length > 0 && (
              <Alert variant="warning" title={`${result.skipped.length} Skipped`}>
                <ul className="mt-1 space-y-1">
                  {result.skipped.map((s, i) => (
                    <li key={i} className="text-xs">
                      <span className="font-medium">{s.folder}</span> — {s.reason}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            <div className="flex gap-2 flex-wrap">
              {result.school_name && (
                <Badge variant="info">School: {result.school_name}</Badge>
              )}
              {result.session && <Badge>Session: {result.session}</Badge>}
              {result.class_name && <Badge>Class: {result.class_name}</Badge>}
              {result.section && <Badge>Section: {result.section}</Badge>}
              {result.removed_count != null && (
                <Badge variant={result.removed_count > 0 ? "warning" : "default"}>
                  Removed: {result.removed_count} student(s)
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
