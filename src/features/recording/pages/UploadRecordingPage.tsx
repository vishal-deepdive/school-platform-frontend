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
} from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { recordingApi } from "@/features/recording/api/recording";
import { getErrorMessage, downloadFile } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { Badge } from "@/shared/components/ui/Badge";
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

export function UploadRecordingPage() {
  const { user } = useAuthStore();
  const [file, setFile] = useState<File[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [params, setParams] = useState({
    school_name: "",
    class_name: "",
    section: "",
    subject: "",
    recording_subject: "",
  });

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: ({ f, p }: { f: File; p: Record<string, string> }) =>
      recordingApi.processAudio(f, p),
    onSuccess: (data) => {
      setJobId(data.job_id);
      toast.success("Upload successful! Processing your recording…");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { data: jobStatus } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => recordingApi.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 3000 : false;
    },
  });

  useEffect(() => {
    if (jobStatus?.status === "completed" && jobId && !markdown) {
      recordingApi
        .getResultMarkdown(jobId)
        .then(setMarkdown)
        .catch(() => {});
    }
  }, [jobStatus?.status, jobId, markdown]);

  const handleUpload = () => {
    if (!file[0]) {
      toast.error("Please select an audio file");
      return;
    }
    if ((user?.role === "admin" && !params.school_name) || !params.class_name) {
      toast.error("School name and class are required");
      return;
    }
    upload({ f: file[0], p: params });
  };

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 gap-6 ${(jobId && jobStatus) ? "lg:grid-cols-2" : ""}`}>
        <Card>
          <CardHeader title="Recording Details" />
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {user?.role === "admin" && (
                <Input
                  label="School Name"
                  placeholder="Delhi Public School"
                  value={params.school_name}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, school_name: e.target.value }))
                  }
                />
              )}
              <Input
                label="Class"
                placeholder="10"
                value={params.class_name}
                onChange={(e) =>
                  setParams((p) => ({ ...p, class_name: e.target.value }))
                }
              />
              <Input
                label="Section (optional)"
                placeholder="A"
                value={params.section}
                onChange={(e) =>
                  setParams((p) => ({ ...p, section: e.target.value }))
                }
              />
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
              label="Audio File"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/*"
              maxSize={500 * 1024 * 1024}
              onChange={setFile}
              hint="MP3, WAV, M4A. Max 500 MB."
            />

            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={
                !!jobId &&
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
          jobStatus &&
          (() => {
            const config =
              statusConfig[jobStatus.status] ?? statusConfig.pending;
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

                  {jobStatus.progress && (
                    <p className="text-sm text-muted-foreground">
                      {jobStatus.progress}
                    </p>
                  )}

                  {jobStatus.status === "processing" && (
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        AI is transcribing and generating study materials. This
                        may take 1–3 minutes.
                      </p>
                    </div>
                  )}

                  {jobStatus.status === "failed" && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {jobStatus.error ?? "Processing failed."}
                      </p>
                    </div>
                  )}

                  {jobStatus.status === "completed" && !markdown && (
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
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Generated Study Materials
              </h3>
            </div>
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
          <div className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto max-h-[60vh] rounded-lg bg-muted/40 p-4">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </Card>
      )}
    </div>
  );
}
