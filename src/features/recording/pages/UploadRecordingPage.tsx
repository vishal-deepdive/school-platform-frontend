import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Loader2,
  Mic2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { recordingApi } from "@/features/recording/api/recording";
import {
  optimizeAudioForUpload,
  MAX_UPLOAD_BYTES,
  type OptimizeProgress,
} from "@/features/recording/lib/optimizeAudio";
import { cn, getErrorMessage, downloadBlob, formatFileSize } from "@/shared/lib/utils";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { FormActions } from "@/shared/components/ui/FormActions";
import { FormSection } from "@/shared/components/ui/FormSection";
import { Input } from "@/shared/components/ui/Input";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { Panel } from "@/shared/components/ui/Panel";
import { Select } from "@/shared/components/ui/Select";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import type { JobStatus, JobStatusResponse } from "@/features/recording/types";

const statusConfig: Record<
  JobStatus,
  {
    label: string;
    color: "default" | "info" | "success" | "danger";
    icon: React.ReactNode;
  }
> = {
  pending: { label: "Queued", color: "default", icon: <Clock className="h-4 w-4" /> },
  processing: {
    label: "Processing",
    color: "info",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  completed: {
    label: "Completed",
    color: "success",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  failed: { label: "Failed", color: "danger", icon: <XCircle className="h-4 w-4" /> },
  not_found: { label: "Not found", color: "danger", icon: <XCircle className="h-4 w-4" /> },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

interface JobStatusCardProps {
  jobId: string;
  jobStatus?: JobStatusResponse;
  deduplicated: boolean;
  markdown: string | null;
}

function JobStatusCard({ jobId, jobStatus, deduplicated, markdown }: JobStatusCardProps) {
  const effectiveStatus: JobStatus = deduplicated ? "completed" : jobStatus!.status;
  const config = statusConfig[effectiveStatus] ?? statusConfig.pending;
  const working = jobStatus?.status === "pending" || jobStatus?.status === "processing";

  return (
    <Panel icon={config.icon} title="Processing status">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={config.color}>{config.label}</Badge>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{jobId}</p>
        </div>

        {deduplicated && (
          <Alert variant="info" title="Already processed">
            An identical recording was processed before — showing those study materials instead of
            paying to transcribe it again.
          </Alert>
        )}

        {jobStatus?.progress && <p className="text-sm text-muted-foreground">{jobStatus.progress}</p>}

        {jobStatus?.status === "pending" && jobStatus.queue_position != null && (
          <p className="text-sm text-muted-foreground">
            Position {jobStatus.queue_position} in the queue.
          </p>
        )}

        {working && (
          <Alert variant="info" title="Generating study materials">
            The recording is being transcribed and turned into notes, questions and a summary. You
            can leave this page — it keeps running.
          </Alert>
        )}

        {jobStatus?.status === "failed" && (
          <Alert variant="error" title="Processing failed">
            {jobStatus.error ?? "Something went wrong while processing this recording."}
          </Alert>
        )}

        {effectiveStatus === "completed" && !markdown && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading study materials…
          </p>
        )}
      </div>
    </Panel>
  );
}

export function UploadRecordingPage() {
  const { schoolId, schoolName, isAdmin } = useActiveSchool();
  const [file, setFile] = useState<File[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Client-side audio optimization runs before the upload request starts.
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState<OptimizeProgress>({
    stage: "",
    percent: null,
  });
  // When a re-upload is deduplicated the job is already complete on the
  // backend, so we skip status polling and fetch the existing result directly.
  const [deduplicated, setDeduplicated] = useState(false);
  const [params, setParams] = useState({
    class_name: "",
    section: "",
    subject: "",
    recording_subject: "",
  });

  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = params.class_name ? getSectionOptions(params.class_name) : [];

  // Clear the class picker when the active school changes (its classes differ).
  useEffect(() => {
    setParams((p) => ({ ...p, class_name: "", section: "" }));
  }, [schoolId]);

  const handleClassChange = (className: string) => {
    setParams((p) => ({ ...p, class_name: className, section: "" }));
  };

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: ({ f, p }: { f: File; p: Record<string, string> }) =>
      recordingApi.processAudio(f, p, setUploadProgress),
    onSuccess: (data) => {
      setJobId(data.job_id);
      if (data.deduplicated) {
        // Identical audio was already processed — surface the existing result
        // immediately instead of fake-polling a job that is already done.
        setDeduplicated(true);
        toast.success("This recording was already processed — loading notes…");
      } else {
        setDeduplicated(false);
        toast.success("Uploaded. Processing your recording…");
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { data: jobStatus } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => recordingApi.getJobStatus(jobId!),
    // Skip polling entirely for deduplicated jobs — they're already complete.
    enabled: !!jobId && !deduplicated,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 3000 : false;
    },
  });

  const isComplete = deduplicated || jobStatus?.status === "completed";
  const isWorking =
    !!jobId &&
    !deduplicated &&
    (jobStatus?.status === "pending" || jobStatus?.status === "processing");

  useEffect(() => {
    if (!(isComplete && jobId && !markdown)) return;
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 5;

    const poll = () => {
      recordingApi.getResultMarkdown(jobId).then((res) => {
        if (cancelled) return;
        if (res.state === "ready") {
          setMarkdown(res.markdown);
        } else if (res.state === "error") {
          toast.error(res.message);
        } else if (res.state === "not_found") {
          toast.error("Study materials could not be found for this recording.");
        } else if (res.state === "generating") {
          // The job status said "completed" but the result row isn't populated
          // yet (a race, not a permanent state) — retry a bounded number of
          // times instead of leaving the spinner stuck forever.
          attempt += 1;
          if (attempt < maxAttempts) {
            setTimeout(() => {
              if (!cancelled) poll();
            }, 2000);
          } else {
            toast.error(
              "Study materials are taking longer than expected. Refresh the page to try again.",
            );
          }
        }
      });
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [isComplete, jobId, markdown]);

  const { mutate: downloadPdf, isPending: downloadingPdf } = useMutation({
    mutationFn: () => recordingApi.downloadResult(jobId!, "pdf"),
    onSuccess: (blob) => downloadBlob(blob, `study-materials-${jobId}.pdf`),
    onError: () => toast.error("Failed to generate PDF"),
  });

  const reset = () => {
    setJobId(null);
    setMarkdown(null);
    setDeduplicated(false);
    setUploadProgress(0);
    setFile([]);
  };

  const handleUpload = async () => {
    if (!file[0]) {
      toast.error("Choose a recording to upload");
      return;
    }
    if (isAdmin && !schoolName) {
      toast.error("Select a school first");
      return;
    }
    if (!params.class_name) {
      toast.error("Choose which class this recording is for");
      return;
    }
    // Reset any prior result so the new upload starts from a clean slate.
    setJobId(null);
    setMarkdown(null);
    setDeduplicated(false);
    setUploadProgress(0);

    // Down-convert to 16 kHz mono WAV (the STT target) before uploading — cuts
    // bandwidth with no transcription-quality loss. Best-effort: on any failure
    // optimizeAudioForUpload returns the original file untouched.
    let toUpload = file[0];
    let durationSeconds: number | undefined;
    setOptimizing(true);
    setOptimizeProgress({ stage: "Preparing…", percent: null });
    try {
      const res = await optimizeAudioForUpload(file[0], setOptimizeProgress);
      toUpload = res.file;
      durationSeconds = res.durationSeconds;
      if (res.optimized) {
        const saved = Math.round((1 - res.outputBytes / res.originalBytes) * 100);
        toast.success(
          `Optimized for upload — ${saved}% smaller (${formatFileSize(
            res.originalBytes,
          )} → ${formatFileSize(res.outputBytes)})`,
        );
      }
    } finally {
      setOptimizing(false);
      setOptimizeProgress({ stage: "", percent: null });
    }

    // Enforce the server's hard limit up front so the user gets an instant,
    // actionable error instead of a 413 after a long upload.
    if (toUpload.size > MAX_UPLOAD_BYTES) {
      toast.error(
        `This recording is ${formatFileSize(toUpload.size)} after optimization, ` +
          `over the ${formatFileSize(MAX_UPLOAD_BYTES)} limit. ` +
          `Please upload a shorter recording or split it into parts.`,
      );
      return;
    }

    // Attach best-effort duration (seconds) so the backend can store it. The
    // school comes from the global active-school selection (blank for non-admins,
    // who are scoped server-side).
    const payload: Record<string, string> = { ...params, school_name: schoolName || "" };
    if (durationSeconds != null) payload.duration_seconds = String(durationSeconds);
    upload({ f: toUpload, p: payload });
  };

  const showStatus = !!jobId && (!!jobStatus || deduplicated);
  const selected = file[0];

  return (
    <div className="space-y-4">
      <div className={cn("grid gap-4", showStatus && "lg:grid-cols-2")}>
        <Panel>
          <div className="flex flex-col gap-5">
            <FormSection
              title="Which class is this for?"
              description="Used to file the notes so the right students can find them."
            >
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <Select
                  label="Class"
                  placeholder="Select class"
                  options={classNameOptions}
                  value={params.class_name}
                  disabled={!schoolId}
                  onChange={(e) => handleClassChange(e.target.value)}
                />
                {sectionOptions.length > 0 ? (
                  <Select
                    label="Section (optional)"
                    placeholder="Select section"
                    options={sectionOptions}
                    value={params.section}
                    onChange={(e) => setParams((p) => ({ ...p, section: e.target.value }))}
                  />
                ) : (
                  <Input
                    label="Section (optional)"
                    placeholder="A"
                    value={params.section}
                    onChange={(e) => setParams((p) => ({ ...p, section: e.target.value }))}
                  />
                )}
                <Input
                  label="Subject (optional)"
                  placeholder="Mathematics"
                  value={params.subject}
                  onChange={(e) => setParams((p) => ({ ...p, subject: e.target.value }))}
                />
                <Input
                  label="Topic (optional)"
                  placeholder="Chapter 5: Quadratic Equations"
                  hint="Shown in the lecture list and searched by Find in Notes."
                  value={params.recording_subject}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, recording_subject: e.target.value }))
                  }
                />
              </div>
            </FormSection>

            <FormSection
              title="The recording"
              description="Large files are down-converted in your browser first, so the upload stays small."
            >
              <FileUpload
                label="Audio or video file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/*,video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
                maxSize={1024 * 1024 * 1024}
                onChange={setFile}
                hint="MP3, WAV, M4A, MP4, MOV, MKV or WebM. Max 1 GB."
              />

              {optimizing && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{optimizeProgress.stage || "Optimizing audio…"}</span>
                    {optimizeProgress.percent != null && (
                      <span className="ml-auto tabular-nums">{optimizeProgress.percent}%</span>
                    )}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    {optimizeProgress.percent != null ? (
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-200"
                        style={{ width: `${optimizeProgress.percent}%` }}
                      />
                    ) : (
                      // Reading/decoding have no measurable progress — an
                      // animated sliver still says "working".
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/70" />
                    )}
                  </div>
                </div>
              )}

              {uploading && (
                <div className="mt-3 space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uploading… <span className="tabular-nums">{uploadProgress}%</span>
                  </p>
                </div>
              )}
            </FormSection>
          </div>
        </Panel>

        {showStatus && (
          <JobStatusCard
            jobId={jobId!}
            jobStatus={jobStatus}
            deduplicated={deduplicated}
            markdown={markdown}
          />
        )}
      </div>

      <FormActions
        info={
          isComplete
            ? "Study materials are ready below."
            : selected
              ? `${selected.name} · ${formatFileSize(selected.size)}`
              : "Choose a class and a recording to get started."
        }
      >
        {isComplete && (
          <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={reset}>
            Upload another
          </Button>
        )}
        <Button
          onClick={handleUpload}
          loading={optimizing || uploading}
          disabled={isWorking || !selected || !params.class_name}
          icon={<Mic2 className="h-4 w-4" />}
        >
          {optimizing ? "Optimizing…" : uploading ? "Uploading…" : "Process recording"}
        </Button>
      </FormActions>

      {markdown && (
        <Panel
          icon={<FileText className="h-4 w-4" />}
          title="Generated study materials"
          actions={
            <div className="flex items-center gap-2">
              <CopyButton text={markdown} />
              <Button
                variant="outline"
                size="sm"
                loading={downloadingPdf}
                onClick={() => downloadPdf()}
              >
                {downloadingPdf ? "Generating PDF…" : "Download PDF"}
              </Button>
            </div>
          }
        >
          <div className="max-h-[65vh] overflow-y-auto rounded-lg bg-muted/30 p-5 scrollbar-thin">
            <MarkdownRenderer content={markdown} />
          </div>
        </Panel>
      )}
    </div>
  );
}
