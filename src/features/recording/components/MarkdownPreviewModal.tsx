import { FileText } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { SkeletonText } from "@/shared/components/ui/Skeleton";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";
import type { MarkdownResult } from "@/features/recording/types";

interface MarkdownPreviewModalProps {
  open: boolean;
  onClose: () => void;
  /** `null` while the markdown is still loading. */
  result: MarkdownResult | null;
  title?: string;
}

/** Reusable modal that renders a recording's generated study materials. */
export function MarkdownPreviewModal({
  open,
  onClose,
  result,
  title = "Study Materials",
}: MarkdownPreviewModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      {result === null ? (
        <SkeletonText lines={8} className="py-2" />
      ) : result.state === "ready" ? (
        <div className="overflow-y-auto max-h-[60vh]">
          <MarkdownRenderer content={result.markdown} />
        </div>
      ) : result.state === "generating" ? (
        <Alert variant="info">
          These study materials are still being generated. Please check back in
          a minute.
        </Alert>
      ) : result.state === "not_found" ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No study materials"
          description="Study materials are not available for this recording yet."
        />
      ) : (
        <Alert variant="error">{result.message}</Alert>
      )}
    </Modal>
  );
}
