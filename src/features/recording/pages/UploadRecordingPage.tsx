import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Mic2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import { recordingApi } from "@/features/recording/api/recording";
import {
  optimizeAudioForUpload,
  MAX_UPLOAD_BYTES,
  type OptimizeProgress,
} from "@/features/recording/lib/optimizeAudio";
import { getErrorMessage, downloadBlob, formatFileSize } from "@/shared/lib/utils";
import { Panel } from "@/shared/components/ui/Panel";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Badge } from "@/shared/components/ui/Badge";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
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
  pending: {
    label: "Queued",
    color: "default",
    icon: <Clock className="h-4 w-4" />,
  },
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
  failed: {
    label: "Failed",
    color: "danger",
    icon: <XCircle className="h-4 w-4" />,
  },
  not_found: {
    label: "Not Found",
    color: "danger",
    icon: <XCircle className="h-4 w-4" />,
  },
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

/** Formats an ETA in seconds as a short human-readable string. */
// function formatEta(seconds: number): string {
//   if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
//   const mins = Math.round(seconds / 60);
//   return `${mins} min${mins === 1 ? "" : "s"}`;
// }

interface JobStatusCardProps {
  jobId: string;
  jobStatus?: JobStatusResponse;
  deduplicated: boolean;
  markdown: string | null;
}

function JobStatusCard({ jobId, jobStatus, deduplicated, markdown }: JobStatusCardProps) {
  const effectiveStatus: JobStatus = deduplicated ? "completed" : jobStatus!.status;
  const config = statusConfig[effectiveStatus] ?? statusConfig.pending;

  return (
    <Panel icon={config.icon} title="Processing status">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant={config.color}>{config.label}</Badge>
          <p className="text-xs text-muted-foreground">Job ID: {jobId}</p>
        </div>

        {deduplicated && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              An identical recording was already processed. Showing the existing study materials.
            </p>
          </div>
        )}

        {jobStatus?.progress && (
          <p className="text-sm text-muted-foreground">{jobStatus.progress}</p>
        )}

        {jobStatus?.status === "pending" && jobStatus.queue_position != null && (
          <p className="text-sm text-muted-foreground">
            Position {jobStatus.queue_position} in queue.
          </p>
        )}

        {(jobStatus?.status === "pending" || jobStatus?.status === "processing") && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              AI is transcribing and generating study materials.
              {/* {jobStatus.eta_seconds != null
                ? ` Estimated time remaining: ${formatEta(jobStatus.eta_seconds)}.`
                : " This may take a few minutes."} */}
            </p>
          </div>
        )}

        {jobStatus?.status === "failed" && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4">
            <p className="text-sm text-red-700 dark:text-red-300">
              {jobStatus.error ?? "Processing failed."}
            </p>
          </div>
        )}

        {effectiveStatus === "completed" && !markdown && (
          <p className="text-sm text-muted-foreground">Loading study materials…</p>
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
  const sectionOptions = params.class_name
    ? getSectionOptions(params.class_name)
    : [];

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
        toast.success("Upload successful! Processing your recording…");
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
          // Previously silently ignored, leaving "Loading study materials…"
          // stuck forever with no recovery path.
          toast.error("Study materials could not be found for this recording.");
        } else if (res.state === "generating") {
          // The job status said "completed" but the result row isn't
          // populated yet (a race, not a permanent state) — retry a bounded
          // number of times instead of leaving the spinner stuck forever.
          attempt += 1;
          if (attempt < maxAttempts) {
            setTimeout(() => {
              if (!cancelled) poll();
            }, 2000);
          } else {
            toast.error("Study materials are taking longer than expected. Refresh the page to try again.");
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

  const handleUpload = async () => {
    if (!file[0]) {
      toast.error("Please select an audio file");
      return;
    }
    if ((isAdmin && !schoolName) || !params.class_name) {
      toast.error("School name and class are required");
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
        const saved = Math.round(
          (1 - res.outputBytes / res.originalBytes) * 100,
        );
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
    const payload: Record<string, string> = {
      ...params,
      school_name: schoolName || "",
    };
    if (durationSeconds != null) {
      payload.duration_seconds = String(durationSeconds);
    }
    upload({ f: toUpload, p: payload });
  };

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 gap-6 ${(jobId && (jobStatus || deduplicated)) ? "lg:grid-cols-2" : ""}`}>
        <Panel>
          <div className="flex flex-col gap-5">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Class &amp; subject
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-start">
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
                    onChange={(e) =>
                      setParams((p) => ({ ...p, section: e.target.value }))
                    }
                  />
                ) : (
                  <Input
                    label="Section (optional)"
                    placeholder="A"
                    value={params.section}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, section: e.target.value }))
                    }
                  />
                )}
                <Input
                  label="Subject (optional)"
                  placeholder="Mathematics"
                  value={params.subject}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, subject: e.target.value }))
                  }
                />
                <Input
                  label="Recording Topic (optional)"
                  placeholder="Chapter 5: Quadratic Equations"
                  className="sm:col-span-2"
                  value={params.recording_subject}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      recording_subject: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Recording file
              </h4>
              <FileUpload
                label="Audio or Video File"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/*,video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
                maxSize={1024 * 1024 * 1024}
                onChange={setFile}
                hint="MP3, WAV, M4A, MP4, MOV, MKV, WebM. Max 1 GB. Large files are optimized in your browser before upload."
              />
            </div>

            {optimizing && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{optimizeProgress.stage || "Optimizing audio…"}</span>
                  {optimizeProgress.percent != null && (
                    <span className="ml-auto tabular-nums">
                      {optimizeProgress.percent}%
                    </span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  {optimizeProgress.percent != null ? (
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${optimizeProgress.percent}%` }}
                    />
                  ) : (
                    // Indeterminate stage (reading/decoding have no measurable
                    // progress) — an animated sliver keeps the user informed.
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/70" />
                  )}
                </div>
              </div>
            )}

            {uploading && (
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Uploading… {uploadProgress}%
                </p>
              </div>
            )}

            <Button
              onClick={handleUpload}
              loading={optimizing || uploading}
              disabled={
                !!jobId &&
                !deduplicated &&
                (jobStatus?.status === "pending" ||
                  jobStatus?.status === "processing")
              }
              icon={<Mic2 className="h-4 w-4" />}
              className="self-start"
            >
              {optimizing
                ? "Optimizing…"
                : uploading
                  ? "Uploading…"
                  : "Process Recording"}
            </Button>
          </div>
        </Panel>

        {jobId && (jobStatus || deduplicated) && (
          <JobStatusCard
            jobId={jobId}
            jobStatus={jobStatus}
            deduplicated={deduplicated}
            markdown={markdown}
          />
        )}
      </div>

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
          <div className="overflow-y-auto max-h-[65vh] rounded-lg bg-muted/30 p-5">
            <MarkdownRenderer content={markdown} />
          </div>
        </Panel>
      )}
    </div>
  );
}
