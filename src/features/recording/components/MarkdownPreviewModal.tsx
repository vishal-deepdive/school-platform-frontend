import ReactMarkdown from "react-markdown";
import { Modal } from "@/shared/components/ui/Modal";
import { PageSpinner } from "@/shared/components/ui/Spinner";

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
        <div className="prose prose-sm max-w-none overflow-y-auto max-h-[60vh]">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      )}
    </Modal>
  );
}
