import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  Upload,
  X,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { cn, formatFileSize } from "@/shared/lib/utils";

interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  /** Receives the full selected list, which this component manages and renders. */
  onChange?: (files: File[]) => void;
  /**
   * "Add" mode for callers that render their own file rows (e.g. a batch
   * upload queue): each pick/drop is handed over as-is and this component
   * keeps no list of its own.
   */
  onFilesAdded?: (files: File[]) => void;
  /** Single-line dropzone, for sitting above an existing list. */
  compact?: boolean;
  error?: string;
  hint?: string;
}

function isTypeAccepted(file: File, accept: string): boolean {
  return accept.split(",").some((token) => {
    const t = token.trim();
    if (t.startsWith("."))
      return file.name.toLowerCase().endsWith(t.toLowerCase());
    if (t.endsWith("/*")) return file.type.startsWith(t.slice(0, -1));
    return file.type === t;
  });
}

/** Stable enough to key a list and a preview URL: two picks of the same file
 *  from the same folder are the same file. */
function fileKey(f: File): string {
  return `${f.name}:${f.size}:${f.lastModified}`;
}

function isImage(f: File): boolean {
  return f.type.startsWith("image/");
}

/** Type-aware icon, so a ZIP of photos does not look like a spreadsheet. */
function iconFor(f: File) {
  const name = f.name.toLowerCase();
  if (isImage(f)) return ImageIcon;
  if (f.type.startsWith("audio/") || f.type.startsWith("video/")) return FileAudio;
  if (name.endsWith(".zip") || f.type.includes("zip")) return FileArchive;
  if (name.endsWith(".csv") || name.endsWith(".xlsx")) return FileSpreadsheet;
  if (name.endsWith(".pdf") || name.endsWith(".md") || name.endsWith(".txt"))
    return FileText;
  return FileIcon;
}

/**
 * Thumbnails for the images in a selection. Object URLs are created once per
 * list change and revoked on the next one, so a teacher dropping 40 classroom
 * photos does not leak 40 blobs per re-render.
 */
function useImagePreviews(files: File[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const f of files) {
      if (isImage(f)) next[fileKey(f)] = URL.createObjectURL(f);
    }
    setUrls(next);
    return () => {
      for (const url of Object.values(next)) URL.revokeObjectURL(url);
    };
  }, [files]);

  return urls;
}

export function FileUpload({
  label,
  accept,
  multiple = false,
  maxSize,
  onChange,
  onFilesAdded,
  compact = false,
  error,
  hint,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [rejectMessage, setRejectMessage] = useState<string | null>(null);
  // Only this component's own list needs previews; in "add" mode the caller
  // renders its own rows.
  const previews = useImagePreviews(onFilesAdded ? [] : files);

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      setRejectMessage(null);
      if (!incoming) return;

      const rejections: string[] = [];
      const accepted = Array.from(incoming).filter((f) => {
        if (accept && !isTypeAccepted(f, accept)) {
          rejections.push(`"${f.name}" is not a supported file type`);
          return false;
        }
        if (maxSize && f.size > maxSize) {
          rejections.push(
            `"${f.name}" exceeds the ${formatFileSize(maxSize)} size limit`,
          );
          return false;
        }
        return true;
      });

      if (rejections.length > 0) setRejectMessage(rejections[0]);

      if (accepted.length === 0) return;

      if (onFilesAdded) {
        onFilesAdded(multiple ? accepted : accepted.slice(0, 1));
        return;
      }

      // Re-picking a file already in the list is a no-op rather than a
      // duplicate row (and a duplicate upload).
      const seen = new Set(files.map(fileKey));
      const fresh = accepted.filter((f) => !seen.has(fileKey(f)));
      const updated = multiple ? [...files, ...fresh] : accepted.slice(0, 1);
      setFiles(updated);
      onChange?.(updated);
    },
    [files, multiple, maxSize, accept, onChange, onFilesAdded],
  );

  const remove = (key: string) => {
    setRejectMessage(null);
    const updated = files.filter((f) => fileKey(f) !== key);
    setFiles(updated);
    onChange?.(updated);
  };

  const clearAll = () => {
    setRejectMessage(null);
    setFiles([]);
    onChange?.([]);
  };

  const displayError = rejectMessage || error;
  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files],
  );
  // A wall of photos reads better as a thumbnail grid than as stacked rows.
  const asGallery = files.length > 1 && files.every(isImage);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          compact ? "flex-row gap-3 px-4 py-3" : "flex-col gap-2.5 px-6 py-7",
          dragOver
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "border-border/70 bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
          displayError &&
            !dragOver &&
            "border-destructive/50 bg-destructive/5 hover:border-destructive/70",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full transition-colors",
            compact ? "h-9 w-9" : "h-11 w-11",
            dragOver
              ? "bg-primary/15 text-primary"
              : "bg-background text-muted-foreground shadow-xs group-hover:text-primary",
          )}
        >
          <Upload className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </span>
        <div className={compact ? "min-w-0 text-left" : "text-center"}>
          <p className="text-sm font-medium text-foreground">
            {dragOver ? (
              "Drop to add"
            ) : (
              <>
                Drop files here or{" "}
                <span className="text-primary underline-offset-2 group-hover:underline">
                  browse
                </span>
              </>
            )}
          </p>
          {(hint || maxSize) && (
            <p className={cn("text-xs text-muted-foreground", !compact && "mt-1")}>
              {hint}
              {hint && maxSize && " · "}
              {maxSize && `Max ${formatFileSize(maxSize)}`}
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          // Reset so picking the same file again (after removing it) still fires.
          e.target.value = "";
        }}
      />

      {!onFilesAdded && files.length > 0 && (
        <>
          {files.length > 1 && (
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {files.length} files · {formatFileSize(totalSize)}
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 rounded font-medium transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
            </div>
          )}

          {asGallery ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {files.map((f) => {
                const key = fileKey(f);
                return (
                  <li
                    key={key}
                    className="group/thumb relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted"
                  >
                    {previews[key] && (
                      <img
                        src={previews[key]}
                        alt={f.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] text-white">
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      aria-label={`Remove ${f.name}`}
                      className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white opacity-0 transition-opacity hover:bg-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover/thumb:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {files.map((f) => {
                const key = fileKey(f);
                const Icon = iconFor(f);
                return (
                  <li
                    key={key}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 transition-colors hover:border-border"
                  >
                    {previews[key] ? (
                      <img
                        src={previews[key]}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-md border border-border/60 object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {f.name}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatFileSize(f.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      aria-label={`Remove ${f.name}`}
                      className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {displayError && (
        <p className="mt-0.5 text-xs font-medium text-destructive">
          {displayError}
        </p>
      )}
    </div>
  );
}
