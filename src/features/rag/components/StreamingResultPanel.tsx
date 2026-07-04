import { RotateCcw, Download } from "lucide-react";
import { Panel } from "@/shared/components/ui/Panel";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { SkeletonText } from "@/shared/components/ui/Skeleton";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { downloadFile } from "@/shared/lib/utils";

interface StreamingResultPanelProps {
  error: string | null;
  isPending: boolean;
  result: string | null;
  canRetry: boolean;
  onRetry: () => void;
  Icon: React.ElementType;
  title: string;
  pendingMessage?: string;
  actions?: React.ReactNode;
  filename: string;
}

export function StreamingResultPanel({
  error,
  isPending,
  result,
  canRetry,
  onRetry,
  Icon,
  title,
  pendingMessage = "Generating…",
  actions,
  filename,
}: StreamingResultPanelProps) {
  if (error && !isPending) {
    return (
      <Panel>
        <Alert variant="error" title="Generation failed">
          {error}
        </Alert>
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={onRetry}
            disabled={!canRetry}
          >
            Retry
          </Button>
        </div>
      </Panel>
    );
  }

  // Show the streamed content as soon as the first token lands (result is a
  // non-empty string), whether still streaming or complete.
  if (result) {
    return (
      <Panel
        icon={<Icon className="h-4 w-4" />}
        title={title}
        actions={
          <>
            {actions}
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={() => downloadFile(result, filename)}
            >
              Download
            </Button>
          </>
        }
      >
        <div className="scrollbar-thin max-h-[65vh] overflow-y-auto rounded-lg bg-muted/40 p-4">
          <MarkdownRenderer content={result} streaming={isPending} />
        </div>
      </Panel>
    );
  }

  // Request sent but no token has streamed back yet → skeleton placeholder so
  // the user sees a clear "generating" state until the first token arrives.
  if (isPending) {
    return (
      <Panel icon={<Icon className="h-4 w-4" />} title={title}>
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
          {pendingMessage}
        </div>
        <div className="rounded-lg bg-muted/40 p-4">
          <SkeletonText lines={6} />
        </div>
      </Panel>
    );
  }

  return null;
}
