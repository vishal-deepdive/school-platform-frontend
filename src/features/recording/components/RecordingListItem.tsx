import { Trash2, Eye, FileText, Download, RotateCcw } from "lucide-react";
import { formatDate } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import type { Recording } from "@/features/recording/types";

interface RecordingListItemProps {
  recording: Recording;
  /** Retry + delete are principal/admin only; hidden when false. */
  canManage: boolean;
  onPreview: (id: string) => void;
  onDownload: (rec: Recording) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  retrying: boolean;
}

/** A single row in the recordings list, with its per-recording actions. */
export function RecordingListItem({
  recording: rec,
  canManage,
  onPreview,
  onDownload,
  onRetry,
  onDelete,
  retrying,
}: RecordingListItemProps) {
  const displayName = (() => {
    const ext = rec.audio_filename.split(".").pop() || "mp3";
    const className = String(rec.class || "class").trim().replace(/[^a-zA-Z0-9]/g, "_");
    const subject = String(rec.subject || "subject").trim().replace(/[^a-zA-Z0-9]/g, "_");
    const chapter = String(rec.recording_subject || "chapter").trim().replace(/[^a-zA-Z0-9]/g, "_");
    let base = `${className}_${subject}_${chapter}`.replace(/_+/g, "_").replace(/^_|_$/g, "");
    if (!base) base = `recording-${rec.id}`;
    return `${base}.${ext}`;
  })();

  return (
    <li className="group flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-foreground" title={rec.audio_filename}>
            {displayName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge>{rec.school_name}</Badge>
            <Badge variant="info">Class {rec.class}</Badge>
            {rec.section && <Badge>{rec.section}</Badge>}
            {rec.subject && <Badge variant="default">{rec.subject}</Badge>}
            {rec.recording_subject && (
              <Badge variant="purple">{rec.recording_subject}</Badge>
            )}
            <span className="text-xs text-muted-foreground">{formatDate(rec.date)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
        {rec.job_id && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={() => onDownload(rec)}
            title="Download Notes"
          >
            Download
          </Button>
        )}
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => onRetry(rec.id)}
            disabled={retrying}
            title="Retry Processing"
          >
            Retry
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          icon={<Eye className="h-4 w-4" />}
          onClick={() => onPreview(rec.id)}
        >
          View
        </Button>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="h-4 w-4 text-destructive" />}
            onClick={() => onDelete(rec.id)}
            className="text-destructive hover:bg-destructive/10"
          >
            Delete
          </Button>
        )}
      </div>
    </li>
  );
}
