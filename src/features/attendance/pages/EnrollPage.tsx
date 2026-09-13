import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, RefreshCw, UserPlus } from "lucide-react";
import toast from "@/shared/lib/toast";
import { enrollSchema, type EnrollFormData } from "@/features/attendance/schema";
import { attendanceApi } from "@/features/attendance/api/attendance";
import {
  SESSION_OPTIONS,
  ENROLL_MODE_OPTIONS,
  getCurrentSession,
} from "@/features/attendance/constants";
import { parsePhotoFilename } from "@/features/attendance/lib/photoFilename";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { ClassSelect, SectionSelect } from "@/shared/components/ui/ClassSelect";
import { useSchoolClasses } from "@/shared/hooks/useSchoolClasses";
import { getErrorMessage } from "@/shared/lib/utils";
import { Alert } from "@/shared/components/ui/Alert";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { FormActions } from "@/shared/components/ui/FormActions";
import { FormSection } from "@/shared/components/ui/FormSection";
import { Input } from "@/shared/components/ui/Input";
import { Panel } from "@/shared/components/ui/Panel";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import { Select } from "@/shared/components/ui/Select";
import type {
  EnrollResponse,
  UpdateEmbeddingResponse,
} from "@/features/attendance/types";

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
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${TONE_CLASSES[tone]}`}>
      <Avatar name={student.name} seed={student.roll_no} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{student.name}</p>
        <p className="text-xs text-muted-foreground">
          #{student.roll_no} · {student.images_processed} photos
        </p>
      </div>
    </div>
  );
}

type EnrollUploadMethod = "zip" | "photos";

const FORM_ID = "enroll-form";

export function EnrollPage() {
  const { schoolId, schoolName, isAdmin } = useActiveSchool();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("new");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMethod, setUploadMethod] = useState<EnrollUploadMethod>("zip");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [alpha, setAlpha] = useState("0.3");
  const [result, setResult] = useState<EnrollResponse | UpdateEmbeddingResponse | null>(null);

  // Used only to auto-select a class's single section; the pickers read the
  // roster themselves via ClassSelect / SectionSelect.
  const { getSectionOptions } = useSchoolClasses();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EnrollFormData>({
    resolver: zodResolver(enrollSchema),
    defaultValues: {
      session: getCurrentSession(),
      class_name: "",
      section: "",
    },
  });

  const selectedClass = watch("class_name");
  const watchedSection = watch("section");
  // Reset class/section whenever the selected school changes
  useEffect(() => {
    setValue("class_name", "");
    setValue("section", "");
  }, [schoolId, setValue]);

  // Reset the section when the class changes, pre-filling it when the roster
  // leaves no choice (a class with exactly one section).
  useEffect(() => {
    const options = selectedClass ? getSectionOptions(selectedClass) : [];
    setValue("section", options.length === 1 ? options[0].value : "");
  }, [selectedClass, getSectionOptions, setValue]);

  // Single-student direct photo uploads skip the ZIP step but must still follow
  // the same 'RollNo_Name.jpg' identity convention, validated client-side here
  // so a bad filename is caught before it ever reaches the server.
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
  const isRefreshMode = mode === "refresh";

  const { mutate, isPending } = useMutation<
    EnrollResponse | UpdateEmbeddingResponse,
    Error,
    | { kind: "zip"; file: File; params: Record<string, string> }
    | { kind: "photos"; files: File[]; params: Record<string, string> }
  >({
    mutationFn: (vars) => {
      if (vars.kind === "photos")
        return attendanceApi.enrollNewStudentPhotos(vars.files, vars.params);
      if (mode === "refresh") return attendanceApi.updateEmbedding(vars.file, vars.params);
      if (mode === "single") return attendanceApi.enrollNewStudent(vars.file, vars.params);
      return attendanceApi.enroll(vars.file, vars.params);
    },
    onSuccess: (data) => {
      setResult(data);
      // Enrollment/refresh changes the roster or embeddings, so date/range/stats
      // views are now stale.
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      if (isRefreshResult(data)) {
        toast.success(
          `Refreshed ${data.updated_count} · attached ${data.added_count} new face(s)` +
            (data.unresolved_count ? ` · ${data.unresolved_count} unresolved` : ""),
        );
      } else {
        toast.success(
          `Attached faces for ${data.enrolled_students.length} student(s)` +
            (data.unresolved_count ? ` · ${data.unresolved_count} unresolved` : ""),
        );
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
      toast.error("Choose a ZIP file");
      return;
    }
    mutate({ kind: "zip", file: files[0], params });
  };

  const onSubmit = (data: EnrollFormData) => {
    if (isDirectPhotoMode) {
      if (photoFiles.length === 0) {
        toast.error("Choose at least one photo");
        return;
      }
      if (photoValidation.badNames.length > 0) {
        toast.error("Fix the highlighted photo filenames before submitting");
        return;
      }
      if (photoValidation.rollNos.length > 1) {
        toast.error("All photos must be for the same student (same roll number)");
        return;
      }
    } else if (!files[0]) {
      toast.error("Choose a ZIP file");
      return;
    }
    if (isAdmin && !schoolName) {
      toast.error("Select a school first");
      return;
    }
    if (isRefreshMode) {
      const alphaValue = Number(alpha);
      if (
        alpha.trim() === "" ||
        Number.isNaN(alphaValue) ||
        alphaValue < 0 ||
        alphaValue >= 1
      ) {
        toast.error("Blend factor (alpha) must be a number between 0 and 0.99");
        return;
      }
    }
    runEnroll(data);
  };

  const selectedCount = isDirectPhotoMode ? photoFiles.length : files[0] ? 1 : 0;
  const classStepDone = Boolean(selectedClass && watchedSection);
  const actionLabel = isRefreshMode ? "Refresh embeddings" : "Enroll faces";

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-1 gap-4 ${result ? "lg:grid-cols-2" : ""}`}>
        <Panel>
          <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Alert variant="info" title="Photos attach to students already on your roster">
              Add students first via <span className="font-medium">Import students</span> or{" "}
              <span className="font-medium">Student roster → Add student</span>. A photo that
              matches nobody is reported below rather than creating a new record.
            </Alert>

            <FormSection
              step={1}
              complete
              title="What do you want to do?"
              action={
                mode === "single" ? (
                  <SegmentedControl
                    aria-label="Upload method"
                    value={uploadMethod}
                    onChange={setUploadMethod}
                    options={[
                      { value: "zip", label: "ZIP archive" },
                      { value: "photos", label: "Photos" },
                    ]}
                  />
                ) : undefined
              }
            >
              <Select
                aria-label="Enrollment mode"
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
            </FormSection>

            <FormSection
              step={2}
              complete={classStepDone}
              title="Class & session"
              description="Scopes the match to one class, so a roll number from another class is never picked up."
            >
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <Select
                  label="Session"
                  options={SESSION_OPTIONS}
                  error={errors.session?.message}
                  {...register("session")}
                />
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
                <Input label="Subject (optional)" placeholder="Mathematics" {...register("subject")} />
                {isRefreshMode && (
                  <Input
                    label="Blend factor (alpha)"
                    type="number"
                    min={0}
                    max={0.99}
                    step={0.05}
                    value={alpha}
                    onChange={(e) => setAlpha(e.target.value)}
                    hint="How much the new photos count against the existing face (0–0.99). Higher favours the new photos."
                  />
                )}
              </div>
            </FormSection>

            <FormSection
              step={3}
              complete={selectedCount > 0}
              title="Student photos"
              description={
                isDirectPhotoMode
                  ? "Name each photo so we know who it belongs to."
                  : "One folder per student, named by their roll number."
              }
            >
              {isDirectPhotoMode ? (
                <div className="flex flex-col gap-2">
                  <FileUpload
                    key="photos"
                    label="Student photos"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    multiple
                    maxSize={15 * 1024 * 1024}
                    onChange={setPhotoFiles}
                    hint="Name each photo 'RollNo_Name.jpg' (e.g. 101_Priya_Sharma.jpg). Add '_2', '_3' for extra photos of the same student. Max 15 MB each."
                  />
                  {photoValidation.badNames.length > 0 && (
                    <Alert variant="error" title="These filenames are not valid">
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
                      <Alert variant="error" title="All photos must be for the same student">
                        <p className="text-xs">
                          Found roll numbers: {photoValidation.rollNos.join(", ")}
                        </p>
                      </Alert>
                    )}
                </div>
              ) : (
                <FileUpload
                  key="zip"
                  label="Student ZIP file"
                  accept=".zip"
                  maxSize={100 * 1024 * 1024}
                  onChange={setFiles}
                  hint={
                    isRefreshMode
                      ? "Max 100 MB. A folder named after an existing roll number is blended into that student's current face; a student with no face yet gets one attached."
                      : "Max 100 MB. Each student's folder should hold 3-5 clear face photos."
                  }
                />
              )}
            </FormSection>
          </form>
        </Panel>

        {result && isRefreshResult(result) && (
          <div className="space-y-4">
            {result.updated_students.length > 0 && (
              <Panel
                icon={<RefreshCw className="h-4 w-4" />}
                title={`${result.updated_students.length} face(s) refreshed`}
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
                title={`${result.added_students.length} student(s) got their first face on file`}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {result.added_students.map((s) => (
                    <EnrolledStudentCard key={s.roll_no} student={s} tone="green" />
                  ))}
                </div>
              </Panel>
            )}

            {result.skipped && result.skipped.length > 0 && (
              <Alert variant="warning" title={`${result.skipped.length} skipped`}>
                <ul className="mt-1 space-y-1">
                  {result.skipped.map((s, i) => (
                    <li key={i} className="text-xs">
                      <span className="font-medium">{s.folder}</span> — {s.reason}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {result.unresolved && result.unresolved.length > 0 && (
              <Alert
                variant="warning"
                title={`${result.unresolved_count} photo(s) matched nobody on the roster`}
              >
                <ul className="mt-1 max-h-40 space-y-1 overflow-auto">
                  {result.unresolved.map((u, i) => (
                    <li key={i} className="text-xs">
                      <span className="font-medium">{u.roll_no}</span> — {u.reason}
                    </li>
                  ))}
                </ul>
                {result.unresolved_count > result.unresolved.length && (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    Showing the first {result.unresolved.length} of {result.unresolved_count}.
                  </p>
                )}
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              {result.school_name && <Badge variant="info">School: {result.school_name}</Badge>}
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
                title={`${result.enrolled_students.length} student(s) — face attached`}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {result.enrolled_students.map((s) => (
                    <EnrolledStudentCard key={s.roll_no} student={s} tone="green" />
                  ))}
                </div>
              </Panel>
            )}

            {result.skipped && result.skipped.length > 0 && (
              <Alert variant="warning" title={`${result.skipped.length} skipped`}>
                <ul className="mt-1 space-y-1">
                  {result.skipped.map((s, i) => (
                    <li key={i} className="text-xs">
                      <span className="font-medium">{s.folder}</span> — {s.reason}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {result.unresolved && result.unresolved.length > 0 && (
              <Alert
                variant="warning"
                title={`${result.unresolved_count} photo(s) matched nobody on the roster`}
              >
                <ul className="mt-1 max-h-40 space-y-1 overflow-auto">
                  {result.unresolved.map((u, i) => (
                    <li key={i} className="text-xs">
                      <span className="font-medium">{u.roll_no}</span> — {u.reason}
                    </li>
                  ))}
                </ul>
                {result.unresolved_count > result.unresolved.length && (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    Showing the first {result.unresolved.length} of {result.unresolved_count}.
                  </p>
                )}
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              {result.school_name && <Badge variant="info">School: {result.school_name}</Badge>}
              {result.session && <Badge>Session: {result.session}</Badge>}
              {result.class_name && <Badge>Class: {result.class_name}</Badge>}
              {result.section && <Badge>Section: {result.section}</Badge>}
            </div>
          </div>
        )}
      </div>

      <FormActions
        progress={{ done: 1 + (classStepDone ? 1 : 0) + (selectedCount > 0 ? 1 : 0), total: 3 }}
        info={
          !classStepDone
            ? "Step 2 — pick the class and section."
            : selectedCount === 0
              ? "Step 3 — add the photos."
              : isDirectPhotoMode
                ? `Ready: ${selectedCount} photo${selectedCount === 1 ? "" : "s"} for ${selectedClass}-${watchedSection}.`
                : `Ready: ${files[0]?.name ?? "Archive"} for ${selectedClass}-${watchedSection}.`
        }
      >
        <Button
          type="submit"
          form={FORM_ID}
          loading={isPending}
          disabled={selectedCount === 0}
          icon={
            isRefreshMode ? <RefreshCw className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />
          }
        >
          {isPending ? (isRefreshMode ? "Refreshing…" : "Enrolling…") : actionLabel}
        </Button>
      </FormActions>
    </div>
  );
}
