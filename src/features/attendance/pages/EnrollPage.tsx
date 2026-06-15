import { useAuthStore } from "@/features/auth/store/auth";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, CheckCircle2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  enrollSchema,
  type EnrollFormData,
} from "@/features/attendance/schema";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS, ENROLL_MODE_OPTIONS } from "@/features/attendance/constants";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { getErrorMessage } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import type { EnrollResponse } from "@/features/attendance/types";

export function EnrollPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("new");
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<EnrollResponse | null>(null);
  const [schoolId, setSchoolId] = useState<string | undefined>(
    isAdmin ? undefined : user?.school_id ?? undefined,
  );
  // Holds the validated form data while the destructive "replace" mode awaits
  // an explicit confirmation before the enrollment is actually mutated.
  const [pendingReplace, setPendingReplace] = useState<EnrollFormData | null>(
    null,
  );

  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isSearching: schoolsLoading,
  } = useSchoolSearch();
  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EnrollFormData>({
    resolver: zodResolver(enrollSchema),
    defaultValues: {
      session: "2025-26",
      school_name: "",
      class_name: "",
      section: "",
    },
  });

  const selectedClass = watch("class_name");
  const sectionOptions = selectedClass ? getSectionOptions(selectedClass) : [];

  // Reset class/section whenever the selected school changes
  useEffect(() => {
    setValue("class_name", "");
    setValue("section", "");
  }, [schoolId, setValue]);

  // Reset section whenever the selected class changes
  useEffect(() => {
    setValue("section", "");
  }, [selectedClass, setValue]);

  const handleSchoolChange = (id: string) => {
    setSchoolId(id);
    const name = schoolOptions.find((o) => o.value === id)?.label ?? "";
    setValue("school_name", name);
  };

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
      // Enrollment changes the roster, so date/range/stats views are now stale.
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(`Enrolled ${data.enrolled_students.length} student(s)`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const runEnroll = (data: EnrollFormData) => {
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

  const onSubmit = (data: EnrollFormData) => {
    if (!files[0]) {
      toast.error("Please select a ZIP file");
      return;
    }
    if (isAdmin && !data.school_name) {
      toast.error("Please select a school");
      return;
    }
    // "Batch with Replacement" permanently deletes students who are not in the
    // uploaded ZIP (and their attendance). Gate it behind an explicit confirm.
    if (mode === "replace") {
      setPendingReplace(data);
      return;
    }
    runEnroll(data);
  };

  const confirmReplace = () => {
    if (!pendingReplace) return;
    const data = pendingReplace;
    setPendingReplace(null);
    runEnroll(data);
  };

  return (
    <div className="space-y-6 w-full">
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
            <Select
              label="Enrollment Mode"
              options={ENROLL_MODE_OPTIONS}
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setResult(null);
              }}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                label="Session"
                options={SESSION_OPTIONS}
                error={errors.session?.message}
                {...register("session")}
              />
              <Select
                label="Class (optional)"
                placeholder={
                  schoolId ? "Select class" : "Select a school first"
                }
                options={classNameOptions}
                {...register("class_name")}
              />
              {sectionOptions.length > 0 ? (
                <Select
                  label="Section (optional)"
                  placeholder="Select section"
                  options={sectionOptions}
                  {...register("section")}
                />
              ) : (
                <Input
                  label="Section (optional)"
                  placeholder="A"
                  {...register("section")}
                />
              )}
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

      <Modal
        open={pendingReplace !== null}
        onClose={() => setPendingReplace(null)}
        title="Confirm Batch Replacement"
        size="md"
      >
        <div className="space-y-4">
          <Alert variant="error" title="This action is destructive">
            <p className="text-sm">
              Replacing the batch for{" "}
              <span className="font-semibold">
                {pendingReplace?.class_name
                  ? `Class ${pendingReplace.class_name}${
                      pendingReplace.section
                        ? `-${pendingReplace.section}`
                        : ""
                    }`
                  : "the selected class"}
              </span>{" "}
              (session{" "}
              <span className="font-semibold">{pendingReplace?.session}</span>)
              will <span className="font-semibold">permanently delete</span>{" "}
              every enrolled student who is not present in the uploaded ZIP,
              along with all of their attendance records. This cannot be undone.
            </p>
          </Alert>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setPendingReplace(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={isPending}
              onClick={confirmReplace}
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Replace Batch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
