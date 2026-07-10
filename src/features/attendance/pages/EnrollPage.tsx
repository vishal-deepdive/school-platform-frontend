import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import toast from "@/shared/lib/toast";
import {
  enrollSchema,
  type EnrollFormData,
} from "@/features/attendance/schema";
import { attendanceApi } from "@/features/attendance/api/attendance";
import { SESSION_OPTIONS, ENROLL_MODE_OPTIONS } from "@/features/attendance/constants";
import { parsePhotoFilename } from "@/features/attendance/lib/photoFilename";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import { getErrorMessage } from "@/shared/lib/utils";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { Panel } from "@/shared/components/ui/Panel";
import { Avatar } from "@/shared/components/ui/Avatar";
import type { EnrollResponse, UpdateEmbeddingResponse } from "@/features/attendance/types";

function isRefreshResult(
  data: EnrollResponse | UpdateEmbeddingResponse,
): data is UpdateEmbeddingResponse {
  return "updated_count" in data;
}

const TONE_CLASSES = {
  blue: "border-blue-500/20 bg-blue-500/5",
  green: "border-green-500/20 bg-green-500/5",
} as const;

function EnrolledStudentCard({
  student,
  tone,
}: {
  student: { roll_no: string; name: string; images_processed: number };
  tone: keyof typeof TONE_CLASSES;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${TONE_CLASSES[tone]}`}
    >
      <Avatar name={student.name} seed={student.roll_no} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {student.name}
        </p>
        <p className="text-xs text-muted-foreground">
          #{student.roll_no} · {student.images_processed} photos
        </p>
      </div>
    </div>
  );
}

type EnrollUploadMethod = "zip" | "photos";

export function EnrollPage() {
  const { schoolId, schoolName, isAdmin } = useActiveSchool();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("new");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMethod, setUploadMethod] = useState<EnrollUploadMethod>("zip");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [alpha, setAlpha] = useState("0.3");
  const [result, setResult] = useState<EnrollResponse | UpdateEmbeddingResponse | null>(
    null,
  );
  // Holds the validated form data while the destructive "replace" mode awaits
  // an explicit confirmation before the enrollment is actually mutated.
  const [pendingReplace, setPendingReplace] = useState<EnrollFormData | null>(
    null,
  );

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

  // Single-student direct photo uploads skip the ZIP step but must still
  // follow the same 'RollNo_Name.jpg' identity convention, validated client
  // -side here so a bad filename is caught before it ever reaches the server.
  const photoValidation = useMemo(() => {
    const badNames: string[] = [];
    const rollNos = new Set<string>();
    for (const f of photoFiles) {
      const parsed = parsePhotoFilename(f.name);
      if (!parsed) {
        badNames.push(f.name);
        continue;
      }
      rollNos.add(parsed.rollNo);
    }
    return { badNames, rollNos: Array.from(rollNos) };
  }, [photoFiles]);

  const isDirectPhotoMode = mode === "single" && uploadMethod === "photos";

  const { mutate, isPending } = useMutation<
    EnrollResponse | UpdateEmbeddingResponse,
    Error,
    | { kind: "zip"; file: File; params: Record<string, string> }
    | { kind: "photos"; files: File[]; params: Record<string, string> }
  >({
    mutationFn: (vars) => {
      if (vars.kind === "photos")
        return attendanceApi.enrollNewStudentPhotos(vars.files, vars.params);
      if (mode === "refresh")
        return attendanceApi.updateEmbedding(vars.file, vars.params);
      if (mode === "single")
        return attendanceApi.enrollNewStudent(vars.file, vars.params);
      if (mode === "replace")
        return attendanceApi.enrollWithReplacement(vars.file, vars.params);
      return attendanceApi.enroll(vars.file, vars.params);
    },
    onSuccess: (data) => {
      setResult(data);
      // Enrollment/refresh changes the roster or embeddings, so date/range/stats
      // views are now stale.
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      if (isRefreshResult(data)) {
        toast.success(
          `Refreshed ${data.updated_count} · added ${data.added_count} embedding(s)`,
        );
      } else {
        toast.success(`Enrolled ${data.enrolled_students.length} student(s)`);
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const runEnroll = (data: EnrollFormData) => {
    const params: Record<string, string> = {
      school_name: schoolName || "",
      session: data.session,
      ...(data.class_name && { class_name: data.class_name }),
      ...(data.section && { section: data.section }),
      ...(data.subject && { subject: data.subject }),
      ...(mode === "refresh" && { alpha }),
    };
    if (isDirectPhotoMode) {
      mutate({ kind: "photos", files: photoFiles, params });
      return;
    }
    if (!files[0]) {
      toast.error("Please select a ZIP file");
      return;
    }
    mutate({ kind: "zip", file: files[0], params });
  };

  const onSubmit = (data: EnrollFormData) => {
    if (isDirectPhotoMode) {
      if (photoFiles.length === 0) {
        toast.error("Please select at least one photo");
        return;
      }
      if (photoValidation.badNames.length > 0) {
        toast.error("Fix the highlighted photo filenames before submitting");
        return;
      }
      if (photoValidation.rollNos.length > 1) {
        toast.error(
          "All photos must be for the same student (same roll number)",
        );
        return;
      }
    } else if (!files[0]) {
      toast.error("Please select a ZIP file");
      return;
    }
    if (isAdmin && !schoolName) {
      toast.error("Please select a school");
      return;
    }
    if (mode === "refresh") {
      const alphaValue = Number(alpha);
      if (alpha.trim() === "" || Number.isNaN(alphaValue) || alphaValue < 0 || alphaValue >= 1) {
        toast.error("Blend factor (alpha) must be a number between 0 and 0.99");
        return;
      }
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
    <div className="space-y-6">
      <div className={`grid grid-cols-1 gap-6 ${result ? "lg:grid-cols-2" : ""}`}>
        <Panel>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Select
              label="Enrollment Mode"
              options={ENROLL_MODE_OPTIONS}
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setResult(null);
                // Direct-photo upload only applies to single-student mode —
                // switching away should always land back on the ZIP form.
                if (e.target.value !== "single") setUploadMethod("zip");
              }}
            />

            {mode === "single" && (
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
            )}

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class &amp; session
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-start">
              <Select
                label="Session"
                options={SESSION_OPTIONS}
                error={errors.session?.message}
                {...register("session")}
              />
              <Select
                label="Class"
                placeholder="Select class"
                options={classNameOptions}
                disabled={!schoolId}
                error={errors.class_name?.message}
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
              {mode === "refresh" && (
                <Input
                  label="Blend factor (alpha)"
                  type="number"
                  min={0}
                  max={0.99}
                  step={0.05}
                  value={alpha}
                  onChange={(e) => setAlpha(e.target.value)}
                  hint="Weight given to the new photos vs. the existing embedding (0–1). Higher favours the new photos."
                />
              )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Student photos
              </p>
              {isDirectPhotoMode ? (
              <div className="flex flex-col gap-2">
                <FileUpload
                  key="photos"
                  label="Student Photos"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  multiple
                  maxSize={15 * 1024 * 1024}
                  onChange={setPhotoFiles}
                  hint="Name each photo 'RollNo_Name.jpg' (e.g. 101_Priya_Sharma.jpg). Add '_2', '_3', etc. for extra photos of the same student. Max 15 MB each."
                />
                {photoValidation.badNames.length > 0 && (
                  <Alert variant="error" title="These filenames aren't valid">
                    <ul className="mt-1 space-y-1">
                      {photoValidation.badNames.map((name) => (
                        <li key={name} className="text-xs">
                          <span className="font-medium">{name}</span> — expected
                          'RollNo_Name.jpg' (e.g. '101_Priya_Sharma.jpg')
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}
                {photoValidation.badNames.length === 0 &&
                  photoValidation.rollNos.length > 1 && (
                    <Alert
                      variant="error"
                      title="All photos must be for the same student"
                    >
                      <p className="text-xs">
                        Found roll numbers: {photoValidation.rollNos.join(", ")}
                      </p>
                    </Alert>
                  )}
              </div>
            ) : (
              <FileUpload
                key="zip"
                label="Student ZIP File"
                accept=".zip"
                maxSize={100 * 1024 * 1024}
                onChange={setFiles}
                hint={
                  mode === "refresh"
                    ? "Max 100 MB. Folders keyed by existing roll numbers are blended into their current embedding; new roll numbers are added."
                    : "Max 100 MB. Each student's folder should contain 3-5 clear face photos."
                }
              />
            )}
            </div>

            <Button
              type="submit"
              loading={isPending}
              className="self-start"
              icon={mode === "refresh" ? <RefreshCw className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            >
              {mode === "refresh"
                ? isPending
                  ? "Refreshing…"
                  : "Refresh Embeddings"
                : isPending
                  ? "Enrolling…"
                  : "Enroll Students"}
            </Button>
          </form>
        </Panel>

        {result && isRefreshResult(result) && (
          <div className="space-y-4">
            {result.updated_students.length > 0 && (
              <Panel
                icon={<RefreshCw className="h-4 w-4" />}
                title={`${result.updated_students.length} embedding(s) refreshed`}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {result.updated_students.map((s) => (
                    <EnrolledStudentCard key={s.roll_no} student={s} tone="blue" />
                  ))}
                </div>
              </Panel>
            )}

            {result.added_students.length > 0 && (
              <Panel
                icon={<CheckCircle2 className="h-4 w-4" />}
                title={`${result.added_students.length} new student(s) added`}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {result.added_students.map((s) => (
                    <EnrolledStudentCard key={s.roll_no} student={s} tone="green" />
                  ))}
                </div>
              </Panel>
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

            <div className="flex flex-wrap gap-2">
              {result.school_name && (
                <Badge variant="info">School: {result.school_name}</Badge>
              )}
              {result.session && <Badge>Session: {result.session}</Badge>}
              <Badge>Alpha: {result.alpha}</Badge>
            </div>
          </div>
        )}

        {result && !isRefreshResult(result) && (
          <div className="space-y-4">
            {result.enrolled_students.length > 0 && (
              <Panel
                icon={<CheckCircle2 className="h-4 w-4" />}
                title={`${result.enrolled_students.length} student(s) enrolled`}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {result.enrolled_students.map((s) => (
                    <EnrolledStudentCard key={s.roll_no} student={s} tone="green" />
                  ))}
                </div>
              </Panel>
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

            <div className="flex flex-wrap gap-2">
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
