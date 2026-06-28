import { RotateCcw, Download } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
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
      <Card>
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
      </Card>
    );
  }

  if (result !== null) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">{title}</h3>
            {actions}
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={() => downloadFile(result, filename)}
          >
            Download
          </Button>
        </div>
        <div className="overflow-y-auto max-h-[65vh] rounded-lg bg-muted/40 p-4">
          <MarkdownRenderer content={result} streaming={isPending} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 py-12 text-muted-foreground">
        <div className="animate-spin">
          <Icon className="h-8 w-8" />
        </div>
        <p>{pendingMessage}</p>
      </div>
    </Card>
  );
}
