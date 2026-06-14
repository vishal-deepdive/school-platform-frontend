import { Modal } from "@/shared/components/ui/Modal";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";

interface MarkdownPreviewModalProps {
  open: boolean;
  onClose: () => void;
  /** `null` while the markdown is still loading. */
  markdown: string | null;
  title?: string;
}

/** Reusable modal that renders a recording's generated study materials. */
export function MarkdownPreviewModal({
  open,
  onClose,
  markdown,
  title = "Study Materials",
}: MarkdownPreviewModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      {!markdown ? (
        <PageSpinner />
      ) : (
        <div className="overflow-y-auto max-h-[60vh]">
          <MarkdownRenderer content={markdown} />
        </div>
      )}
    </Modal>
  );
}
