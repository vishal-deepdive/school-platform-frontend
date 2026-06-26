import { useAuthStore } from "@/features/auth/store/auth";
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
import toast from "react-hot-toast";
import { recordingApi } from "@/features/recording/api/recording";
import { getErrorMessage, downloadFile } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Badge } from "@/shared/components/ui/Badge";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useClassOptions } from "@/shared/hooks/useClassOptions";
import type { JobStatus } from "@/features/recording/types";

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
function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  const mins = Math.round(seconds / 60);
  return `${mins} min${mins === 1 ? "" : "s"}`;
}

export function UploadRecordingPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const [file, setFile] = useState<File[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // When a re-upload is deduplicated the job is already complete on the
  // backend, so we skip status polling and fetch the existing result directly.
  const [deduplicated, setDeduplicated] = useState(false);
  const [schoolId, setSchoolId] = useState<string | undefined>(
    isAdmin ? undefined : user?.school_id ?? undefined,
  );
  const [params, setParams] = useState({
    school_name: "",
    class_name: "",
    section: "",
    subject: "",
    recording_subject: "",
  });

  const {
    options: schoolOptions,
    setQuery: setSchoolQuery,
    isSearching: schoolsLoading,
  } = useSchoolSearch();
  const { classNameOptions, getSectionOptions } = useClassOptions(schoolId);
  const sectionOptions = params.class_name
    ? getSectionOptions(params.class_name)
    : [];

  const handleSchoolChange = (id: string) => {
    setSchoolId(id);
    const name = schoolOptions.find((o) => o.value === id)?.label ?? "";
    setParams((p) => ({ ...p, school_name: name, class_name: "", section: "" }));
  };

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
    if (isComplete && jobId && !markdown) {
      recordingApi.getResultMarkdown(jobId).then((res) => {
        if (res.state === "ready") setMarkdown(res.markdown);
        else if (res.state === "error") toast.error(res.message);
      });
    }
  }, [isComplete, jobId, markdown]);

  const handleUpload = () => {
    if (!file[0]) {
      toast.error("Please select an audio file");
      return;
    }
    if ((user?.role === "admin" && !params.school_name) || !params.class_name) {
      toast.error("School name and class are required");
      return;
    }
    // Reset any prior result so the new upload starts from a clean slate.
    setJobId(null);
    setMarkdown(null);
    setDeduplicated(false);
    setUploadProgress(0);
    upload({ f: file[0], p: params });
  };

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 gap-6 ${(jobId && (jobStatus || deduplicated)) ? "lg:grid-cols-2" : ""}`}>
        <Card>
          <CardHeader title="Recording Details" />
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
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
                placeholder={schoolId ? "Select class" : "Select a school first"}
                options={classNameOptions}
                value={params.class_name}
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
                className="col-span-2"
                value={params.recording_subject}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    recording_subject: e.target.value,
                  }))
                }
              />
            </div>

            <FileUpload
              label="Audio or Video File"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/*,video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
              maxSize={200 * 1024 * 1024}
              onChange={setFile}
              hint="MP3, WAV, M4A, MP4, MOV, MKV, WebM. Max 200 MB."
            />

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
              loading={uploading}
              disabled={
                !!jobId &&
                !deduplicated &&
                (jobStatus?.status === "pending" ||
                  jobStatus?.status === "processing")
              }
              icon={<Mic2 className="h-4 w-4" />}
            >
              {uploading ? "Uploading…" : "Process Recording"}
            </Button>
          </div>
        </Card>

        {jobId &&
          (jobStatus || deduplicated) &&
          (() => {
            // A deduplicated job is already complete on the backend.
            const status: JobStatus = deduplicated
              ? "completed"
              : jobStatus!.status;
            const config = statusConfig[status] ?? statusConfig.pending;
            return (
              <Card>
                <CardHeader title="Processing Status" />
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {config.icon}
                    <div>
                      <Badge variant={config.color}>{config.label}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Job ID: {jobId}
                      </p>
                    </div>
                  </div>

                  {deduplicated && (
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        An identical recording was already processed. Showing
                        the existing study materials.
                      </p>
                    </div>
                  )}

                  {jobStatus?.progress && (
                    <p className="text-sm text-muted-foreground">
                      {jobStatus.progress}
                    </p>
                  )}

                  {jobStatus?.status === "pending" &&
                    jobStatus.queue_position != null && (
                      <p className="text-sm text-muted-foreground">
                        Position {jobStatus.queue_position} in queue.
                      </p>
                    )}

                  {(jobStatus?.status === "pending" ||
                    jobStatus?.status === "processing") && (
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        AI is transcribing and generating study materials.
                        {jobStatus.eta_seconds != null
                          ? ` Estimated time remaining: ${formatEta(jobStatus.eta_seconds)}.`
                          : " This may take a few minutes."}
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

                  {status === "completed" && !markdown && (
                    <p className="text-sm text-muted-foreground">
                      Loading study materials…
                    </p>
                  )}
                </div>
              </Card>
            );
          })()}
      </div>

      {markdown && (
        <Card className="relative group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Generated Study Materials
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton text={markdown} />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadFile(markdown, `study-materials-${jobId}.md`)
                }
              >
                Download .md
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[65vh] rounded-lg bg-muted/30 p-5">
            <MarkdownRenderer content={markdown} />
          </div>
        </Card>
      )}
    </div>
  );
}
