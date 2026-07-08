import { BookOpen, Copy, FileText } from "lucide-react";
import toast from "@/shared/lib/toast";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Skeleton, SkeletonText } from "@/shared/components/ui/Skeleton";
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
  description?: string;
}

/** Reusable modal that renders a recording's generated study materials. */
export function MarkdownPreviewModal({
  open,
  onClose,
  result,
  title = "Study Materials",
  description = "Notes and summaries generated from this recording.",
}: MarkdownPreviewModalProps) {
  const handleCopy = async () => {
    if (!result || result.state !== "ready") return;
    try {
      await navigator.clipboard.writeText(result.markdown);
      toast.success("Study material copied to clipboard.");
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      icon={<BookOpen />}
      size="3xl"
      footer={
        <>
          {result?.state === "ready" && (
            <Button
              variant="outline"
              type="button"
              icon={<Copy className="h-4 w-4" />}
              onClick={handleCopy}
            >
              Copy
            </Button>
          )}
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {result === null ? (
        <div className="space-y-5">
          <Skeleton className="h-7 w-1/2" />
          <SkeletonText lines={3} />
          <Skeleton className="h-36 w-full rounded-xl" />
          <SkeletonText lines={5} />
        </div>
      ) : result.state === "ready" ? (
        <MarkdownRenderer content={result.markdown} />
      ) : result.state === "generating" ? (
        <Alert variant="info">
          These study materials are still being generated. Please check back in
          a minute.
        </Alert>
      ) : result.state === "not_found" ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No study materials yet"
          description="Study materials haven't been generated for this recording."
        />
      ) : (
        <Alert variant="error">{result.message}</Alert>
      )}
    </Modal>
  );
}
