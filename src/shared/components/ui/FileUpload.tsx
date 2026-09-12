import { useRef, useState, useCallback } from "react";
import { Upload, X, File as FileIcon } from "lucide-react";
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

      const updated = multiple ? [...files, ...accepted] : accepted.slice(0, 1);
      setFiles(updated);
      onChange?.(updated);
    },
    [files, multiple, maxSize, accept, onChange, onFilesAdded],
  );

  const remove = (index: number) => {
    setRejectMessage(null);
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onChange?.(updated);
  };

  const displayError = rejectMessage || error;

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
          "flex items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
          compact ? "flex-row gap-3 px-4 py-3" : "flex-col gap-2 p-8",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border/50 bg-accent/30 hover:border-border hover:bg-accent/50",
          displayError &&
            "border-destructive/50 bg-destructive/5 hover:border-destructive/70",
        )}
      >
        <Upload
          className={cn(
            "shrink-0 transition-colors",
            compact ? "h-5 w-5" : "h-8 w-8",
            dragOver ? "text-primary" : "text-muted-foreground",
          )}
        />
        <div className={compact ? "min-w-0 text-left" : "text-center"}>
          <p className="text-sm font-medium text-foreground">
            Drop files here or{" "}
            <span className="text-primary hover:underline">browse</span>
          </p>
          {hint && (
            <p className={cn("text-xs text-muted-foreground", !compact && "mt-1")}>
              {hint}
            </p>
          )}
          {maxSize && (
            <p className="text-xs text-muted-foreground">
              Max size: {formatFileSize(maxSize)}
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
        <ul className="flex flex-col gap-2">
          {files.map((f, i) => (
            <li
              key={f.name + f.size}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm px-3 py-2 transition-colors hover:bg-accent/30"
            >
              <FileIcon className="h-4 w-4 flex-shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate font-medium">
                  {f.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(f.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${f.name}`}
                className="flex-shrink-0 rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {displayError && (
        <p className="text-xs font-medium text-destructive mt-0.5">
          {displayError}
        </p>
      )}
    </div>
  );
}
