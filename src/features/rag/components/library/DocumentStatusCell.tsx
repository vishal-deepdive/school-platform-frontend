import { AlertCircle, CheckCircle2, Globe, Loader2, Lock } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";
import { stageLabel, type ResolvedStatus } from "@/features/rag/lib/documentStatus";

/** Status pill plus one line of detail: passages indexed, live progress, or the error. */
export function DocumentStatusCell({ status }: { status: ResolvedStatus }) {
  if (status.status === "completed") {
    return (
      <div className="min-w-0">
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </Badge>
        {status.totalChunks ? (
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {status.totalChunks} passages
          </p>
        ) : null}
      </div>
    );
  }

  if (status.status === "failed") {
    return (
      <div className="min-w-0">
        <Badge variant="danger" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
        {status.error && (
          <p className="mt-1 max-w-[16rem] truncate text-xs text-destructive" title={status.error}>
            {status.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <Badge variant="warning" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        {stageLabel(status.status)}
      </Badge>
      {status.progress && (
        <p className="mt-1 max-w-[16rem] truncate text-xs text-muted-foreground" title={status.progress}>
          {status.progress}
        </p>
      )}
    </div>
  );
}

/** Where a book is available: platform-wide public content, or one school's upload. */
export function DocumentScope({
  isGlobal,
  schoolName,
}: {
  isGlobal?: boolean;
  schoolName?: string;
}) {
  if (isGlobal) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Globe className="h-3.5 w-3.5 shrink-0" />
        Public
      </span>
    );
  }
  const label = schoolName || "School upload";
  return (
    <span
      className="inline-flex min-w-0 max-w-[11rem] items-center gap-1.5 text-xs text-muted-foreground"
      title={label}
    >
      <Lock className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}
