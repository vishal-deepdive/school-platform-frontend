import { useRef } from "react";
import { RotateCcw, Download, Printer, Square } from "lucide-react";
import { Panel } from "@/shared/components/ui/Panel";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { SkeletonText } from "@/shared/components/ui/Skeleton";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import { downloadFile } from "@/shared/lib/utils";
import toast from "@/shared/lib/toast";

/**
 * Print the already-rendered markdown by cloning its HTML into a detached
 * window. Uses the live DOM (tables, lists, math) rather than re-parsing the
 * source, so the printout matches what the user sees. Falls back to a toast if
 * a popup blocker prevents opening the print window.
 */
function printContent(node: HTMLElement | null, title: string) {
  if (!node) return;
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) {
    toast.error("Allow pop-ups to print or save as PDF.");
    return;
  }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
           color:#111;line-height:1.6;max-width:760px;margin:32px auto;padding:0 24px;}
      h1,h2,h3,h4{line-height:1.25;margin:1.2em 0 .5em;}
      table{border-collapse:collapse;width:100%;margin:1em 0;}
      th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;}
      code{background:#f3f3f3;padding:1px 4px;border-radius:3px;}
      pre{background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto;}
      @page{margin:16mm;}
    </style></head><body>${node.innerHTML}</body></html>`);
  win.document.close();
  win.focus();
  // Give the new document a tick to lay out before invoking print.
  setTimeout(() => {
    win.print();
    win.close();
  }, 250);
}

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
  /** When provided, a Stop button is shown while streaming to cancel the run. */
  onStop?: () => void;
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
  onStop,
}: StreamingResultPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const stopButton = onStop && isPending && (
    <Button
      variant="outline"
      size="sm"
      icon={<Square className="h-3.5 w-3.5" />}
      onClick={onStop}
    >
      Stop
    </Button>
  );

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
            {stopButton}
            {!isPending && (
              <Button
                variant="outline"
                size="sm"
                icon={<Printer className="h-4 w-4" />}
                onClick={() => printContent(contentRef.current, title)}
              >
                Print / PDF
              </Button>
            )}
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
        <div
          ref={contentRef}
          className="scrollbar-thin max-h-[65vh] overflow-y-auto rounded-lg bg-muted/40 p-4"
        >
          <MarkdownRenderer content={result} streaming={isPending} />
        </div>
      </Panel>
    );
  }

  // Request sent but no token has streamed back yet → skeleton placeholder so
  // the user sees a clear "generating" state until the first token arrives.
  if (isPending) {
    return (
      <Panel icon={<Icon className="h-4 w-4" />} title={title} actions={stopButton}>
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
