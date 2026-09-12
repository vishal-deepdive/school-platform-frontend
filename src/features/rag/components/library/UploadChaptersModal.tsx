import { useCallback, useId, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/shared/components/ui/SearchableSelect";
import { Select } from "@/shared/components/ui/Select";
import { cn, formatFileSize, getErrorMessage, sortClassesDescending } from "@/shared/lib/utils";
import { adminApi } from "@/features/admin/api/admin";
import { ragApi } from "@/features/rag/api/rag";
import {
  RAG_OTHER_SUBJECT,
  SUBJECT_OPTIONS,
  UPLOAD_BOARD_OPTIONS,
} from "@/features/rag/constants";
import {
  invalidateRagLibrary,
  useRagClassLevels,
  useRagMediums,
} from "@/features/rag/hooks/useRag";
import { guessChapterFromFilename } from "@/features/rag/lib/chapterFilename";

/** Pre-fill for the book details, taken from where the user is browsing. */
export interface UploadDefaults {
  classLevel?: string;
  subject?: string;
  board?: string;
  medium?: string;
}

interface UploadChaptersModalProps {
  open: boolean;
  onClose: () => void;
  defaults: UploadDefaults;
  isAdmin: boolean;
  /** Admin's active school, preselected when an upload is made school-only. */
  activeSchoolId?: string;
  /** Non-admin uploads are always scoped to the uploader's own school. */
  ownSchoolId?: string;
}

type RowState = "ready" | "uploading" | "throttled" | "done" | "duplicate" | "error";

interface UploadRow {
  key: string;
  file: File;
  chapterNumber: string;
  chapterName: string;
  state: RowState;
  progress: number;
  message?: string;
  errors?: { chapterNumber?: string; chapterName?: string };
}

interface Details {
  classLevel: string;
  subject: string;
  subjectOther: string;
  board: string;
  medium: string;
  forAllSchools: boolean;
  schoolId: string;
}

type DetailErrors = Partial<Record<keyof Details | "files", string>>;

const ACCEPT = ".pdf,.docx,.pptx,.md,.txt";
// The upload route allows 20/minute per user; two at a time stays well clear
// while still halving a batch's wall-clock time.
const CONCURRENCY = 2;
const MAX_THROTTLE_WAIT_S = 90;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let rowSeq = 0;

function initialDetails(defaults: UploadDefaults): Details {
  const subject = defaults.subject ?? "";
  const knownSubject = !subject || SUBJECT_OPTIONS.some((o) => o.value === subject);
  const board =
    UPLOAD_BOARD_OPTIONS.find((o) => o.value.toLowerCase() === defaults.board?.toLowerCase())
      ?.value ?? "CBSE";
  return {
    classLevel: defaults.classLevel ?? "",
    subject: knownSubject ? subject : RAG_OTHER_SUBJECT,
    subjectOther: knownSubject ? "" : subject,
    board,
    medium: defaults.medium ?? "",
    forAllSchools: true,
    schoolId: "",
  };
}

function retryAfterSeconds(err: unknown): number {
  if (!isAxiosError(err)) return 30;
  const header = Number(err.response?.headers?.["retry-after"]);
  if (Number.isFinite(header) && header > 0) return Math.ceil(header);
  const body = Number(
    (err.response?.data as { retry_after_seconds?: number } | undefined)?.retry_after_seconds,
  );
  return Number.isFinite(body) && body > 0 ? Math.ceil(body) : 30;
}

const isPendingRow = (row: UploadRow) => row.state === "ready" || row.state === "error";

/**
 * Batch chapter upload: shared book details once, then one row per file with
 * chapter number/name guessed from the file name. Uploads run as a small queue
 * with per-file progress; duplicates can be replaced in place, and rate limits
 * are waited out instead of failing the batch.
 */
export function UploadChaptersModal({
  open,
  onClose,
  defaults,
  isAdmin,
  activeSchoolId,
  ownSchoolId,
}: UploadChaptersModalProps) {
  const formId = useId();
  const queryClient = useQueryClient();
  const { data: classData } = useRagClassLevels();
  const { data: mediumData, isLoading: mediumsLoading } = useRagMediums();
  const mediums = useMemo(() => mediumData?.mediums ?? [], [mediumData]);

  // Only admins pick a target school, and only once the dialog is open.
  const { data: schools, isLoading: schoolsLoading } = useQuery({
    queryKey: ["admin", "schools"],
    queryFn: () => adminApi.listSchools(),
    enabled: isAdmin && open,
    staleTime: 5 * 60 * 1000,
  });

  const [details, setDetails] = useState<Details>(() => initialDetails(defaults));
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [errors, setErrors] = useState<DetailErrors>({});
  const [running, setRunning] = useState(false);

  const medium = details.medium || (mediums.length === 1 ? mediums[0] : "");
  const resolvedSubject =
    details.subject === RAG_OTHER_SUBJECT ? details.subjectOther.trim() : details.subject;

  const classOptions = useMemo(() => {
    const levels = [...sortClassesDescending(classData?.class_levels ?? [])];
    if (details.classLevel && !levels.includes(details.classLevel)) {
      levels.unshift(details.classLevel);
    }
    return [{ value: "", label: "Select class" }, ...levels.map((c) => ({ value: c, label: c }))];
  }, [classData, details.classLevel]);

  const mediumOptions = mediumsLoading
    ? [{ value: "", label: "Loading…" }]
    : [{ value: "", label: "Select medium" }, ...mediums.map((m) => ({ value: m, label: m }))];

  const activeSchools = useMemo(
    () =>
      (schools ?? [])
        .filter((s) => s.is_active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [schools],
  );
  const schoolOptions: SearchableSelectOption[] = useMemo(
    () =>
      activeSchools.map((s) => ({
        value: s.id,
        label: s.name,
        sublabel: [s.code, s.city, s.state].filter(Boolean).join(" • ") || undefined,
      })),
    [activeSchools],
  );

  const setDetail = <K extends keyof Details>(key: K, value: Details[K]) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const patchRow = useCallback((key: string, patch: Partial<UploadRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const incoming = files.map<UploadRow>((file) => {
      const guess = guessChapterFromFilename(file.name);
      return {
        key: `upload-${++rowSeq}`,
        file,
        chapterNumber: guess.chapterNumber,
        chapterName: guess.chapterName,
        state: "ready",
        progress: 0,
      };
    });
    setErrors((e) => (e.files ? { ...e, files: undefined } : e));
    setRows((prev) => {
      const seen = new Set(prev.map((r) => `${r.file.name}:${r.file.size}`));
      return [...prev, ...incoming.filter((r) => !seen.has(`${r.file.name}:${r.file.size}`))];
    });
  }, []);

  /** Inline validation for the book details and every row about to upload. */
  const validate = (): boolean => {
    const next: DetailErrors = {};
    if (!details.classLevel) next.classLevel = "Choose a class.";
    if (!details.subject) next.subject = "Choose a subject.";
    else if (details.subject === RAG_OTHER_SUBJECT && !resolvedSubject) {
      next.subjectOther = "Enter the subject name.";
    }
    if (!details.board) next.board = "Choose a board.";
    if (!medium) next.medium = "Choose the book's medium.";
    if (isAdmin && !details.forAllSchools && !details.schoolId) {
      next.schoolId = "Choose a school, or make the book available to all schools.";
    }
    if (rows.length === 0) next.files = "Add at least one chapter file.";
    setErrors(next);

    const numberCounts = new Map<string, number>();
    rows.forEach((r) => {
      const n = r.chapterNumber.trim().toLowerCase();
      if (n && r.state !== "done") numberCounts.set(n, (numberCounts.get(n) ?? 0) + 1);
    });

    let rowsValid = true;
    const checked = rows.map((r) => {
      if (!isPendingRow(r)) return r;
      const number = r.chapterNumber.trim();
      const rowErrors = {
        chapterNumber: !number
          ? "Required"
          : (numberCounts.get(number.toLowerCase()) ?? 0) > 1
            ? "Used twice in this batch"
            : undefined,
        chapterName: r.chapterName.trim() ? undefined : "Required",
      };
      if (rowErrors.chapterNumber || rowErrors.chapterName) {
        rowsValid = false;
        return { ...r, errors: rowErrors };
      }
      return r.errors ? { ...r, errors: undefined } : r;
    });
    setRows(checked);

    return rowsValid && Object.keys(next).length === 0;
  };

  const uploadRow = async (row: UploadRow, replace: boolean): Promise<RowState> => {
    const payload = new FormData();
    payload.append("file", row.file);
    payload.append("class_level", details.classLevel);
    payload.append("subject", resolvedSubject);
    payload.append("chapter_number", row.chapterNumber.trim());
    payload.append("chapter_name", row.chapterName.trim());
    payload.append("board", details.board);
    payload.append("medium", medium);
    const schoolId = isAdmin
      ? details.forAllSchools
        ? undefined
        : details.schoolId
      : ownSchoolId;
    if (schoolId) payload.append("school_id", schoolId);
    if (replace) payload.append("replace", "true");

    let lastProgress = -1;
    patchRow(row.key, { state: "uploading", progress: 0, message: undefined });

    for (let attempt = 0; ; attempt++) {
      try {
        const res = await ragApi.uploadDocument(payload, {
          onUploadProgress: (event) => {
            if (!event.total) return;
            const pct = Math.round((event.loaded / event.total) * 100);
            // Coarse steps: a batch shouldn't re-render per network chunk.
            if (pct - lastProgress >= 5 || pct === 100) {
              lastProgress = pct;
              patchRow(row.key, { progress: pct });
            }
          },
        });
        patchRow(row.key, {
          state: "done",
          progress: 100,
          message: res.deduplicated ? "Already in the library — nothing to re-index." : undefined,
        });
        return "done";
      } catch (err) {
        const status = isAxiosError(err) ? err.response?.status : undefined;
        if (status === 409) {
          patchRow(row.key, { state: "duplicate", message: getErrorMessage(err) });
          return "duplicate";
        }
        const wait = retryAfterSeconds(err);
        if (status === 429 && attempt < 3 && wait <= MAX_THROTTLE_WAIT_S) {
          patchRow(row.key, {
            state: "throttled",
            message: `Upload limit reached — retrying in ${wait}s.`,
          });
          await sleep(wait * 1000);
          lastProgress = -1;
          patchRow(row.key, { state: "uploading", progress: 0, message: undefined });
          continue;
        }
        patchRow(row.key, { state: "error", message: getErrorMessage(err) });
        return "error";
      }
    }
  };

  const runQueue = async (jobs: { row: UploadRow; replace: boolean }[]) => {
    setRunning(true);
    const outcomes: RowState[] = [];
    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        outcomes.push(await uploadRow(job.row, job.replace));
      }
    };
    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()),
      );
    } finally {
      setRunning(false);
    }
    // One library refetch for the whole batch, not one per file.
    if (outcomes.includes("done")) void invalidateRagLibrary(queryClient);
    return outcomes;
  };

  const submit = async (keepOpen: boolean) => {
    if (running || !validate()) return;
    const targets = rows.filter(isPendingRow);
    if (targets.length === 0) {
      if (!keepOpen) onClose();
      return;
    }

    const outcomes = await runQueue(targets.map((row) => ({ row, replace: false })));
    const uploaded = outcomes.filter((o) => o === "done").length;
    const needsAttention = outcomes.length - uploaded;

    if (uploaded > 0) {
      toast.success(
        uploaded === 1
          ? "Chapter uploaded — indexing has started."
          : `${uploaded} chapters uploaded — indexing has started.`,
      );
    }
    if (needsAttention > 0) {
      toast.warning(
        `${needsAttention} ${needsAttention === 1 ? "file needs" : "files need"} attention.`,
      );
      return;
    }
    if (keepOpen) {
      // Keep the book details; clear finished rows for the next set of files.
      setRows((prev) => prev.filter((r) => r.state !== "done"));
    } else {
      onClose();
    }
  };

  const replaceRow = async (row: UploadRow) => {
    if (running) return;
    const [outcome] = await runQueue([{ row, replace: true }]);
    if (outcome === "done") toast.success("Chapter replaced — re-indexing has started.");
  };

  const handleClose = () => {
    if (running) {
      toast.info("Uploads are still in progress.");
      return;
    }
    onClose();
  };

  const pendingCount = rows.filter(isPendingRow).length;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeOnBackdrop={!running}
      title="Upload chapters"
      icon={<UploadCloud />}
      description={
        details.classLevel && resolvedSubject
          ? `Adding to ${details.classLevel} · ${resolvedSubject}`
          : "Add textbook chapters to the knowledge base."
      }
      size="2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose} disabled={running}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void submit(true)}
            disabled={running}
            className="hidden sm:inline-flex"
          >
            Upload &amp; add more
          </Button>
          <Button type="submit" form={formId} loading={running}>
            {pendingCount > 1 ? `Upload ${pendingCount} chapters` : "Upload"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
        className="space-y-6"
      >
        <section className="space-y-3">
          <SectionHeading title="Book details" hint="Applies to every file below." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Class"
              options={classOptions}
              value={details.classLevel}
              error={errors.classLevel}
              disabled={running}
              onChange={(e) => setDetail("classLevel", e.target.value)}
            />
            <Select
              label="Subject"
              options={[{ value: "", label: "Select subject" }, ...SUBJECT_OPTIONS]}
              value={details.subject}
              error={errors.subject}
              disabled={running}
              onChange={(e) => {
                setDetail("subject", e.target.value);
                setDetail("subjectOther", "");
              }}
            />
            {details.subject === RAG_OTHER_SUBJECT && (
              <div className="sm:col-span-2">
                <Input
                  label="Subject name"
                  placeholder="e.g. Physical Education"
                  value={details.subjectOther}
                  error={errors.subjectOther}
                  disabled={running}
                  onChange={(e) => setDetail("subjectOther", e.target.value)}
                />
              </div>
            )}
            <Select
              label="Board"
              options={UPLOAD_BOARD_OPTIONS}
              value={details.board}
              error={errors.board}
              disabled={running}
              onChange={(e) => setDetail("board", e.target.value)}
            />
            <Select
              label="Medium"
              hint="Language edition of the book"
              options={mediumOptions}
              value={medium}
              error={errors.medium}
              disabled={running}
              onChange={(e) => setDetail("medium", e.target.value)}
            />
          </div>

          {isAdmin && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
              <label className="flex cursor-pointer select-none items-start gap-3">
                <input
                  type="checkbox"
                  checked={details.forAllSchools}
                  disabled={running}
                  onChange={(e) => {
                    const forAll = e.target.checked;
                    setDetail("forAllSchools", forAll);
                    const preselect =
                      !forAll &&
                      !details.schoolId &&
                      activeSchoolId &&
                      activeSchools.some((s) => s.id === activeSchoolId);
                    setDetail("schoolId", forAll ? "" : preselect ? activeSchoolId : details.schoolId);
                  }}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Available to all schools
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {details.forAllSchools
                      ? "Public textbook — every school on the platform can use it."
                      : "Only the selected school can use it."}
                  </span>
                </span>
              </label>
              {!details.forAllSchools && (
                <SearchableSelect
                  label="School"
                  options={schoolOptions}
                  value={details.schoolId}
                  onChange={(value) => setDetail("schoolId", value)}
                  error={errors.schoolId}
                  placeholder={schoolsLoading ? "Loading schools…" : "Select a school…"}
                  searchPlaceholder="Search schools…"
                  isLoading={schoolsLoading}
                  disabled={schoolsLoading || running}
                />
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeading
            title="Chapter files"
            hint="One file per chapter. Numbers and names are read from file names — check them before uploading."
          />
          <FileUpload
            accept={ACCEPT}
            multiple
            compact={rows.length > 0}
            hint="PDF, DOCX, PPTX, MD or TXT"
            onFilesAdded={addFiles}
            error={errors.files}
          />
          {rows.length > 0 && (
            <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
              {rows.map((row) => (
                <UploadRowItem
                  key={row.key}
                  row={row}
                  disabled={running}
                  onChange={(patch) =>
                    patchRow(row.key, {
                      ...patch,
                      errors: undefined,
                      // Editing a rejected duplicate may make it a new chapter.
                      ...(row.state === "duplicate" ? { state: "ready", message: undefined } : {}),
                    })
                  }
                  onRemove={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                  onReplace={() => void replaceRow(row)}
                />
              ))}
            </ul>
          )}
        </section>
      </form>
    </Modal>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const ROW_ICONS: Record<RowState, React.ReactNode> = {
  ready: <FileText className="h-4 w-4 text-muted-foreground" />,
  uploading: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  throttled: <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  done: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  duplicate: <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
};

function UploadRowItem({
  row,
  disabled,
  onChange,
  onRemove,
  onReplace,
}: {
  row: UploadRow;
  disabled: boolean;
  onChange: (patch: Pick<Partial<UploadRow>, "chapterNumber" | "chapterName">) => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const editable =
    !disabled && (row.state === "ready" || row.state === "error" || row.state === "duplicate");
  const removable = row.state !== "uploading" && row.state !== "throttled";

  return (
    <li className="space-y-2 p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{ROW_ICONS[row.state]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground" title={row.file.name}>
            {row.file.name}
          </p>
          <p className="text-xs text-muted-foreground">{formatFileSize(row.file.size)}</p>
        </div>
        {row.state === "duplicate" && (
          <Button type="button" variant="outline" size="sm" onClick={onReplace} disabled={disabled}>
            Replace existing
          </Button>
        )}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove ${row.file.name}`}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {editable ? (
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 pl-8">
          <Input
            aria-label={`Chapter number for ${row.file.name}`}
            placeholder="Ch. no."
            value={row.chapterNumber}
            error={row.errors?.chapterNumber}
            onChange={(e) => onChange({ chapterNumber: e.target.value })}
          />
          <Input
            aria-label={`Chapter name for ${row.file.name}`}
            placeholder="Chapter name"
            value={row.chapterName}
            error={row.errors?.chapterName}
            onChange={(e) => onChange({ chapterName: e.target.value })}
          />
        </div>
      ) : (
        <p className="truncate pl-8 text-xs text-muted-foreground">
          Chapter {row.chapterNumber} · {row.chapterName}
        </p>
      )}

      {row.state === "uploading" && (
        <div
          className="ml-8 h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={row.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Uploading ${row.file.name}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${row.progress}%` }}
          />
        </div>
      )}

      {row.message && (
        <p
          className={cn(
            "pl-8 text-xs",
            row.state === "done" && "text-muted-foreground",
            (row.state === "throttled" || row.state === "duplicate") &&
              "text-amber-700 dark:text-amber-300",
            row.state === "error" && "text-destructive",
          )}
        >
          {row.message}
        </p>
      )}
    </li>
  );
}
