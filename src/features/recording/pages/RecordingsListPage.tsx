import { useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { usePagination } from "@/shared/hooks/usePagination";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { PageSpinner } from "@/shared/components/ui/Spinner";
import { Alert } from "@/shared/components/ui/Alert";
import {
  useRecordingsList,
  useDeleteRecording,
  useRetryRecording,
  useDownloadRecording,
  useRecordingPreview,
} from "@/features/recording/hooks/useRecordings";
import { MarkdownPreviewModal } from "@/features/recording/components/MarkdownPreviewModal";
import { RecordingListItem } from "@/features/recording/components/RecordingListItem";

const PAGE_SIZE = 10;

export function RecordingsListPage() {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useRecordingsList();
  const preview = useRecordingPreview();
  const { mutate: deleteRec, isPending: deleting } = useDeleteRecording();
  const { mutate: retryRec, isPending: retrying } = useRetryRecording();
  const { mutate: download } = useDownloadRecording();

  const total = data?.total ?? 0;
  const { offset, currentPage, totalPages, hasNext, hasPrev, goNext, goPrev } =
    usePagination(PAGE_SIZE, total);

  const pagedRecordings =
    data?.recordings.slice(offset, offset + PAGE_SIZE) ?? [];

  if (isLoading) return <PageSpinner />;
  if (isError) return <Alert variant="error">Failed to load recordings.</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Recordings</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} recording(s) total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          loading={isFetching}
          icon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </div>

      <Card padding="none">
        <CardHeader title="All Recordings" className="px-6 pt-6" />
        {pagedRecordings.length === 0 ? (
          <div className="px-6 pb-8 text-center text-sm text-gray-400">
            No recordings yet.{" "}
            <Link
              to="/recording/upload"
              className="text-indigo-600 hover:underline"
            >
              Upload your first recording.
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pagedRecordings.map((rec) => (
              <RecordingListItem
                key={rec.id}
                recording={rec}
                onPreview={preview.open}
                onDownload={download}
                onRetry={retryRec}
                onDelete={setConfirmDelete}
                retrying={retrying}
              />
            ))}
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={goPrev}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={goNext}
          >
            Next
          </Button>
        </div>
      )}

      <MarkdownPreviewModal
        open={!!preview.previewId}
        onClose={preview.close}
        markdown={preview.markdown}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Recording"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete this recording? This action cannot be
          undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={() =>
              confirmDelete &&
              deleteRec(confirmDelete, {
                onSuccess: () => setConfirmDelete(null),
              })
            }
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
