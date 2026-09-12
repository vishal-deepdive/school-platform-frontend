import { Clock, Download, Eye, RotateCcw, Trash2, User } from "lucide-react";
import { formatDate, formatFileSize } from "@/shared/lib/utils";
import { ActionMenu } from "@/shared/components/ui/ActionMenu";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import type { Recording } from "@/features/recording/types";

interface RecordingListItemProps {
  recording: Recording;
  /** Retry + delete are principal/admin only; hidden when false. */
  canManage: boolean;
  /** Show the school name — only useful when the list spans several schools. */
  showSchool?: boolean;
  onPreview: (id: string) => void;
  onDownload: (rec: Recording) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  retrying: boolean;
  /** When true, a selection checkbox is shown (bulk actions, manage-only). */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

/** Format seconds as h:mm:ss / m:ss, or null when unknown. */
function formatDuration(total?: number): string | null {
  if (!total || total <= 0) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** A single row in the recordings list: View up front, the rest in a ⋯ menu. */
export function RecordingListItem({
  recording: rec,
  canManage,
  showSchool = false,
  onPreview,
  onDownload,
  onRetry,
  onDelete,
  retrying,
  selectable = false,
  selected = false,
  onToggleSelect,
}: RecordingListItemProps) {
  const displayName = (() => {
    // Prefer an explicit title; otherwise derive the class_subject_chapter name.
    if (rec.title && rec.title.trim()) return rec.title.trim();
    const ext = rec.audio_filename.split(".").pop() || "mp3";
    const className = String(rec.class || "class").trim().replace(/[^a-zA-Z0-9]/g, "_");
    const subject = String(rec.subject || "subject").trim().replace(/[^a-zA-Z0-9]/g, "_");
    const chapter = String(rec.recording_subject || "chapter").trim().replace(/[^a-zA-Z0-9]/g, "_");
    let base = `${className}_${subject}_${chapter}`.replace(/_+/g, "_").replace(/^_|_$/g, "");
    if (!base) base = `recording-${rec.id}`;
    return `${base}.${ext}`;
  })();

  const duration = formatDuration(rec.duration_seconds);
  // Only surface a visibility chip when it's NOT the default 'published' state.
  const showVisibility = rec.visibility && rec.visibility !== "published";
  const location = [
    showSchool ? rec.school_name : null,
    `Class ${rec.class}${rec.section ? `-${rec.section}` : ""}`,
    rec.subject,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5">
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect?.(rec.id)}
          aria-label={`Select ${displayName}`}
          className="h-4 w-4 flex-shrink-0 cursor-pointer rounded border-border accent-primary"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground" title={rec.audio_filename}>
            {displayName}
          </p>
          {showVisibility && (
            <Badge variant="warning" className="shrink-0 capitalize">
              {rec.visibility}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {location}
          {rec.recording_subject && (
            <>
              {" · "}
              <span className="text-foreground/80">{rec.recording_subject}</span>
            </>
          )}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>{formatDate(rec.date)}</span>
          {rec.uploader_name && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {rec.uploader_name}
            </span>
          )}
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration}
            </span>
          )}
          {rec.file_size_bytes ? <span>{formatFileSize(rec.file_size_bytes)}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          icon={<Eye className="h-4 w-4" />}
          onClick={() => onPreview(rec.id)}
        >
          View<span className="sr-only"> notes for {displayName}</span>
        </Button>
        <ActionMenu
          label={`More actions for ${displayName}`}
          items={[
            {
              label: "Download notes",
              icon: <Download />,
              onSelect: () => onDownload(rec),
              hidden: !rec.job_id,
            },
            {
              label: "Retry processing",
              icon: <RotateCcw />,
              onSelect: () => onRetry(rec.id),
              disabled: retrying,
              hidden: !canManage,
            },
            {
              label: "Delete recording",
              icon: <Trash2 />,
              danger: true,
              onSelect: () => onDelete(rec.id),
              hidden: !canManage,
            },
          ]}
        />
      </div>
    </li>
  );
}
