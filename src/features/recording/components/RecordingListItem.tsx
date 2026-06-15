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
  onDownload: (jobId: string) => void;
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
  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {rec.audio_filename}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
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
      <div className="flex items-center gap-2 flex-shrink-0">
        {rec.job_id && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={() => onDownload(rec.job_id!)}
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
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => onDelete(rec.id)}
            className="text-destructive hover:bg-destructive/10"
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
